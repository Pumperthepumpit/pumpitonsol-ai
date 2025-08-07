// pages/learn/leaderboard.js
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Leaderboard() {
  const [topUsers, setTopUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('language_users')
        .select('telegram_username, total_xp, daily_streak')
        .order('total_xp', { ascending: false })
        .limit(10);

      if (data) {
        setTopUsers(data);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🏆 PUMPIT Language Learning Leaderboard</h1>
      
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          {topUsers.map((user, index) => (
            <div key={index} style={{ 
              padding: '1rem', 
              margin: '0.5rem 0', 
              background: '#f0f0f0',
              borderRadius: '8px' 
            }}>
              <span style={{ fontSize: '1.5rem' }}>
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
              </span>
              {' '}
              <strong>{user.telegram_username || 'Anonymous'}</strong>
              {' - '}
              {user.total_xp || 0} XP
              {' | '}
              🔥 {user.daily_streak || 0} day streak
            </div>
          ))}
        </div>
      )}
      
      <div style={{ marginTop: '2rem' }}>
        <a href="/learn" style={{ color: 'blue' }}>← Back to Learn</a>
      </div>
    </div>
  );
}