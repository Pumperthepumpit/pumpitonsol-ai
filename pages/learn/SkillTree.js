import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SkillTree({ language, userData }) {
  const [skills, setSkills] = useState([]);
  const [hoveredSkill, setHoveredSkill] = useState(null);

  const SKILL_TREE = {
    spanish: [
      { id: 'basics1', name: 'Basics 1', icon: '👋', x: 50, y: 10, requiredLevel: 0 },
      { id: 'basics2', name: 'Basics 2', icon: '🗣️', x: 50, y: 25, requiredLevel: 1, requires: 'basics1' },
      { id: 'numbers', name: 'Numbers', icon: '🔢', x: 30, y: 40, requiredLevel: 2, requires: 'basics2' },
      { id: 'family', name: 'Family', icon: '👨‍👩‍👧‍👦', x: 70, y: 40, requiredLevel: 3, requires: 'basics2' },
      { id: 'food', name: 'Food', icon: '🍽️', x: 50, y: 55, requiredLevel: 4, requires: ['numbers', 'family'] },
      { id: 'travel', name: 'Travel', icon: '✈️', x: 30, y: 70, requiredLevel: 5, requires: 'food' },
      { id: 'work', name: 'Work', icon: '💼', x: 70, y: 70, requiredLevel: 5, requires: 'food' },
      { id: 'culture', name: 'Culture', icon: '🎨', x: 50, y: 85, requiredLevel: 6, requires: ['travel', 'work'] }
    ],
    french: [
      { id: 'basics1', name: 'Basics 1', icon: '👋', x: 50, y: 10, requiredLevel: 0 },
      { id: 'basics2', name: 'Basics 2', icon: '🗣️', x: 50, y: 25, requiredLevel: 1, requires: 'basics1' },
      { id: 'cuisine', name: 'Cuisine', icon: '🥐', x: 30, y: 40, requiredLevel: 2, requires: 'basics2' },
      { id: 'paris', name: 'Paris', icon: '🗼', x: 70, y: 40, requiredLevel: 3, requires: 'basics2' }
    ],
    german: [
      { id: 'basics1', name: 'Basics 1', icon: '👋', x: 50, y: 10, requiredLevel: 0 },
      { id: 'basics2', name: 'Basics 2', icon: '🗣️', x: 50, y: 25, requiredLevel: 1, requires: 'basics1' },
      { id: 'business', name: 'Business', icon: '📊', x: 30, y: 40, requiredLevel: 2, requires: 'basics2' },
      { id: 'culture', name: 'Culture', icon: '🏰', x: 70, y: 40, requiredLevel: 3, requires: 'basics2' }
    ]
  };

  useEffect(() => {
    if (language && SKILL_TREE[language]) {
      setSkills(SKILL_TREE[language]);
    }
  }, [language]);

  const isUnlocked = (skill) => {
    if (!userData) return false;
    
    const userLevel = Math.floor((userData.total_xp || 0) / 100) + 1;
    if (userLevel < skill.requiredLevel) return false;
    
    if (skill.requires) {
      if (Array.isArray(skill.requires)) {
        return skill.requires.every(req => {
          const progress = userData.crown_progress?.[`${language}_${req}`] || 0;
          return progress > 0;
        });
      } else {
        const progress = userData.crown_progress?.[`${language}_${skill.requires}`] || 0;
        return progress > 0;
      }
    }
    
    return true;
  };

  const getCrowns = (skillId) => {
    return userData?.crown_progress?.[`${language}_${skillId}`] || 0;
  };

  const drawConnections = () => {
    const connections = [];
    skills.forEach((skill, index) => {
      if (skill.requires) {
        const requirements = Array.isArray(skill.requires) ? skill.requires : [skill.requires];
        requirements.forEach(req => {
          const requiredSkill = skills.find(s => s.id === req);
          if (requiredSkill) {
            connections.push(
              <line
                key={`${req}-${skill.id}`}
                x1={`${requiredSkill.x}%`}
                y1={`${requiredSkill.y + 3}%`}
                x2={`${skill.x}%`}
                y2={`${skill.y - 3}%`}
                stroke={isUnlocked(skill) ? '#FFD700' : '#444'}
                strokeWidth="2"
                strokeDasharray={isUnlocked(skill) ? "0" : "5,5"}
              />
            );
          }
        });
      }
    });
    return connections;
  };

  return (
    <div className="skill-tree-container">
      <div className="skill-tree">
        <svg className="connections" viewBox="0 0 100 100" preserveAspectRatio="none">
          {drawConnections()}
        </svg>
        
        {skills.map((skill) => {
          const unlocked = isUnlocked(skill);
          const crowns = getCrowns(skill.id);
          
          return (
            <div
              key={skill.id}
              className={`skill-node ${unlocked ? 'unlocked' : 'locked'} ${hoveredSkill === skill.id ? 'hovered' : ''}`}
              style={{
                left: `${skill.x}%`,
                top: `${skill.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              onMouseEnter={() => setHoveredSkill(skill.id)}
              onMouseLeave={() => setHoveredSkill(null)}
            >
              {unlocked ? (
                <Link href={`/learn/${language}/${skill.id}`}>
                  <a className="skill-link">
                    <div className="skill-icon">{skill.icon}</div>
                    <div className="skill-name">{skill.name}</div>
                    <div className="skill-crowns">
                      {'👑'.repeat(Math.min(crowns, 5))}
                      {'🔲'.repeat(Math.max(0, 5 - crowns))}
                    </div>
                  </a>
                </Link>
              ) : (
                <div className="skill-locked">
                  <div className="skill-icon">🔒</div>
                  <div className="skill-name">{skill.name}</div>
                  <div className="skill-requirement">Level {skill.requiredLevel}</div>
                </div>
              )}
              
              {hoveredSkill === skill.id && (
                <div className="skill-tooltip">
                  <h4>{skill.name}</h4>
                  <p>Required Level: {skill.requiredLevel}</p>
                  {unlocked ? (
                    <p>Progress: {crowns}/5 crowns</p>
                  ) : (
                    <p>🔒 Complete prerequisites to unlock</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .skill-tree-container {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }

        .skill-tree {
          position: relative;
          height: 600px;
          background: linear-gradient(180deg, #1a1a2e 0%, #0f0f1e 100%);
          border-radius: 20px;
          border: 2px solid #333;
          overflow: hidden;
        }

        .connections {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          pointer-events: none;
        }

        .skill-node {
          position: absolute;
          width: 80px;
          height: 100px;
          cursor: pointer;
          transition: all 0.3s ease;
          z-index: 10;
        }

        .skill-node.hovered {
          transform: translate(-50%, -50%) scale(1.1);
          z-index: 20;
        }

        .skill-link, .skill-locked {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          text-decoration: none;
        }

        .skill-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          margin-bottom: 0.25rem;
          transition: all 0.3s ease;
        }

        .unlocked .skill-icon {
          background: linear-gradient(135deg, #FFD700, #FFA500);
          box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
        }

        .locked .skill-icon {
          background: #333;
          border: 2px solid #555;
        }

        .skill-name {
          font-size: 0.75rem;
          color: white;
          font-weight: 600;
        }

        .skill-crowns {
          font-size: 0.6rem;
          margin-top: 0.25rem;
        }

        .skill-requirement {
          font-size: 0.65rem;
          color: #888;
          margin-top: 0.25rem;
        }

        .skill-tooltip {
          position: absolute;
          bottom: 110%;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.95);
          border: 1px solid #FFD700;
          border-radius: 10px;
          padding: 0.75rem;
          min-width: 150px;
          z-index: 30;
          pointer-events: none;
        }

        .skill-tooltip h4 {
          color: #FFD700;
          margin: 0 0 0.5rem 0;
          font-size: 0.9rem;
        }

        .skill-tooltip p {
          color: #ccc;
          margin: 0.25rem 0;
          font-size: 0.75rem;
        }

        @media (max-width: 768px) {
          .skill-tree {
            height: 500px;
          }

          .skill-node {
            width: 60px;
            height: 80px;
          }

          .skill-icon {
            width: 45px;
            height: 45px;
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}