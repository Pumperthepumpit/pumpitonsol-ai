import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const LANGUAGES = {
  spanish: { name: 'Spanish', flag: '🇪🇸', code: 'es' },
  french: { name: 'French', flag: '🇫🇷', code: 'fr' },
  german: { name: 'German', flag: '🇩🇪', code: 'de' }
};

// Sample lessons structure - you'll expand this
const LESSONS = {
  spanish: [
    {
      id: 1,
      title: 'Basic Greetings',
      xp: 10,
      questions: [
        {
          type: 'translate',
          question: 'Hello',
          answer: 'Hola',
          options: ['Hola', 'Adiós', 'Por favor', 'Gracias']
        },
        {
          type: 'translate',
          question: 'Good morning',
          answer: 'Buenos días',
          options: ['Buenos días', 'Buenas noches', 'Hola', 'Adiós']
        }
      ]
    }
  ],
  french: [
    {
      id: 1,
      title: 'Basic Greetings',
      xp: 10,
      questions: [
        {
          type: 'translate',
          question: 'Hello',
          answer: 'Bonjour',
          options: ['Bonjour', 'Au revoir', 'Merci', 'S\'il vous plaît']
        }
      ]
    }
  ],
  german: [
    {
      id: 1,
      title: 'Basic Greetings',
      xp: 10,
      questions: [
        {
          type: 'translate',
          question: 'Hello',
          answer: 'Hallo',
          options: ['Hallo', 'Auf Wiedersehen', 'Danke', 'Bitte']
        }
      ]
    }
  ]
};

export default function LanguagePage() {
  const router = useRouter();
  const { language } = router.query;
  const [walletAddress, setWalletAddress] = useState(null);
  const [userData, setUserData] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [hearts, setHearts] = useState(5);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkWalletAndAccess();
  }, [language]);

  const checkWalletAndAccess = async () => {
    if (typeof window !== 'undefined' && window.solana && window.solana.isConnected) {
      try {
        const response = await window.solana.connect({ onlyIfTrusted: true });
        const address = response.publicKey.toString();
        setWalletAddress(address);
        
        // Verify PUMPIT balance
        const balanceResponse = await fetch('/api/check-pumpit-balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: address })
        });
        
        const balanceData = await balanceResponse.json();
        
        if (balanceData.balance > 0) {
          // Get user data from Supabase
          const { data: user } = await supabase
            .from('language_users')
            .select('*')
            .eq('wallet_address', address)
            .single();
            
          if (user) {
            setUserData(user);
            setHearts(user.hearts_remaining);
          }
          
          // Load first lesson
          if (language && LESSONS[language]) {
            setCurrentLesson(LESSONS[language][0]);
          }
        } else {
          router.push('/learn');
        }
      } catch (error) {
        console.error('Wallet check failed:', error);
        router.push('/learn');
      }
    } else {
      router.push('/learn');
    }
    setIsLoading(false);
  };

  const handleAnswer = async (answer) => {
    if (showResult || hearts <= 0) return;
    
    setSelectedAnswer(answer);
    const correct = answer === currentLesson.questions[currentQuestion].answer;
    setIsCorrect(correct);
    setShowResult(true);
    
    if (!correct) {
      // Lose a heart
      const newHearts = hearts - 1;
      setHearts(newHearts);
      
      // Update in database
      await supabase
        .from('language_users')
        .update({ hearts_remaining: newHearts })
        .eq('wallet_address', walletAddress);
        
      if (newHearts <= 0) {
        setTimeout(() => {
          alert('Out of hearts! Buy more to continue.');
          router.push('/learn/dashboard');
        }, 1500);
      }
    } else {
      // Gain XP
      const xpGained = 10;
      setEarnedXP(earnedXP + xpGained);
      
      // Update XP in database
      await supabase
        .from('language_users')
        .update({ total_xp: userData.total_xp + xpGained })
        .eq('wallet_address', walletAddress);
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < currentLesson.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setShowResult(false);
      setSelectedAnswer('');
    } else {
      // Lesson complete
      alert(`Lesson complete! You earned ${earnedXP} XP!`);
      router.push('/learn/dashboard');
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading lesson...</p>
      </div>
    );
  }

  if (!language || !LANGUAGES[language]) {
    return (
      <div className="error-container">
        <h1>Language not found</h1>
        <Link href="/learn" className="back-btn">
          ← Back to Languages
        </Link>
      </div>
    );
  }

  const langInfo = LANGUAGES[language];
  const question = currentLesson?.questions[currentQuestion];

  return (
    <>
      <Head>
        <title>{langInfo.name} Lessons - PUMPIT Learn</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="lesson-container">
        <header className="lesson-header">
          <Link href="/learn" className="back-btn">
            ← Back
          </Link>
          
          <div className="lesson-info">
            <span className="flag">{langInfo.flag}</span>
            <h1>{langInfo.name}</h1>
          </div>
          
          <div className="hearts-display">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={`heart ${i < hearts ? 'active' : 'lost'}`}>
                ❤️
              </span>
            ))}
          </div>
        </header>

        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${((currentQuestion + 1) / currentLesson?.questions.length) * 100}%` }}
          />
        </div>

        <main className="lesson-main">
          {question && (
            <div className="question-card">
              <h2>Translate this word:</h2>
              <div className="question-text">{question.question}</div>
              
              <div className="options-grid">
                {question.options.map((option, index) => (
                  <button
                    key={index}
                    className={`option-btn ${
                      showResult && option === question.answer ? 'correct' : ''
                    } ${
                      showResult && option === selectedAnswer && !isCorrect ? 'incorrect' : ''
                    }`}
                    onClick={() => handleAnswer(option)}
                    disabled={showResult}
                  >
                    {option}
                  </button>
                ))}
              </div>
              
              {showResult && (
                <div className={`result-message ${isCorrect ? 'correct' : 'incorrect'}`}>
                  {isCorrect ? '✅ Correct! +10 XP' : '❌ Try again!'}
                </div>
              )}
              
              {showResult && (
                <button onClick={nextQuestion} className="continue-btn">
                  Continue →
                </button>
              )}
            </div>
          )}
        </main>
      </div>

      <style jsx>{`
        .loading-container, .error-container {
          min-height: 100vh;
          background: #0a0a0a;
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #FFFF00;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .lesson-container {
          min-height: 100vh;
          background: #0a0a0a;
          color: white;
        }

        .lesson-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .back-btn {
          color: #FFFF00;
          text-decoration: none;
          font-weight: 500;
          transition: opacity 0.3s;
        }

        .back-btn:hover {
          opacity: 0.8;
        }

        .lesson-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .flag {
          font-size: 2rem;
        }

        .lesson-info h1 {
          font-size: 1.5rem;
          color: #FFFF00;
          margin: 0;
        }

        .hearts-display {
          display: flex;
          gap: 0.5rem;
        }

        .heart {
          font-size: 1.5rem;
          transition: all 0.3s ease;
        }

        .heart.lost {
          opacity: 0.3;
          filter: grayscale(1);
        }

        .progress-bar {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #FFFF00, #FFD700);
          transition: width 0.3s ease;
        }

        .lesson-main {
          max-width: 800px;
          margin: 0 auto;
          padding: 3rem 1.5rem;
        }

        .question-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 3rem;
          text-align: center;
        }

        .question-card h2 {
          color: #FFFF00;
          margin-bottom: 2rem;
        }

        .question-text {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 3rem;
          color: white;
        }

        .options-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .option-btn {
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 15px;
          color: white;
          font-size: 1.1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .option-btn:hover:not(:disabled) {
          border-color: #FFFF00;
          transform: translateY(-2px);
        }

        .option-btn:disabled {
          cursor: not-allowed;
        }

        .option-btn.correct {
          background: rgba(0, 255, 0, 0.2);
          border-color: #00FF00;
        }

        .option-btn.incorrect {
          background: rgba(255, 0, 0, 0.2);
          border-color: #FF0000;
        }

        .result-message {
          font-size: 1.2rem;
          font-weight: bold;
          margin: 1.5rem 0;
          padding: 1rem;
          border-radius: 10px;
        }

        .result-message.correct {
          color: #00FF00;
          background: rgba(0, 255, 0, 0.1);
        }

        .result-message.incorrect {
          color: #FF6666;
          background: rgba(255, 0, 0, 0.1);
        }

        .continue-btn {
          background: linear-gradient(135deg, #FFFF00, #FFD700);
          color: black;
          border: none;
          padding: 1rem 2rem;
          border-radius: 50px;
          font-size: 1.1rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .continue-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(255, 255, 0, 0.4);
        }

        @media (max-width: 768px) {
          .options-grid {
            grid-template-columns: 1fr;
          }

          .question-text {
            font-size: 1.5rem;
          }

          .question-card {
            padding: 2rem;
          }
        }
      `}</style>
    </>
  );
}