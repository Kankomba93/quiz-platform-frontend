// App.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io(process.env.REACT_APP_SOCKET_URL);

export default function App() {
  const [username, setUsername] = useState('');
  const [quizId, setQuizId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [voteStats, setVoteStats] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    socket.on('chatMessage', (data) => setMessages((prev) => [...prev, data]));
    socket.on('participantCount', setParticipants);
    socket.on('adminVerified', () => console.log('You are the admin'));

    socket.on('quizStarting', () => {
      setMessages((prev) => [...prev, { username: 'System', message: 'Quiz is starting!' }]);
      setLeaderboard([]);
    });

    socket.on('newQuestion', (q) => {
      setCurrentQuestion(q);
      setSelectedAnswer(null);
      setTimeLeft(10);
      setVoteStats([]);
    });

    socket.on('voteStats', (stats) => {
      setVoteStats(stats);
    });

    socket.on('quizEnded', (finalScores) => {
      setCurrentQuestion(null);
      setLeaderboard(finalScores);
    });

    return () => {
      socket.off('chatMessage');
      socket.off('participantCount');
      socket.off('adminVerified');
      socket.off('quizStarting');
      socket.off('newQuestion');
      socket.off('voteStats');
      socket.off('quizEnded');
    };
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const joinRoom = () => {
    if (username && quizId) {
      socket.emit('joinRoom', { username, quizId, isAdmin });
      setJoined(true);
    }
  };

  const sendMessage = () => {
    if (message) {
      socket.emit('sendMessage', { message, quizId, username });
      setMessage('');
    }
  };

  const startQuiz = () => {
    socket.emit('startQuiz', { quizId });
  };

  const handleAnswer = (idx) => {
    if (selectedAnswer === null) {
      setSelectedAnswer(idx);
      socket.emit('submitAnswer', { quizId, questionIndex: currentQuestion.index, answerIndex: idx, username });
    }
  };

  if (!joined) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Join Quiz Room</h1>
        <input
          className="border p-2 m-2"
          placeholder="Enter Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="border p-2 m-2"
          placeholder="Enter Quiz ID"
          value={quizId}
          onChange={(e) => setQuizId(e.target.value)}
        />
        <label className="m-2">
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
          />{' '}
          I am the host (admin)
        </label>
        <button className="bg-blue-500 text-white p-2 rounded" onClick={joinRoom}>
          Join Room
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <h2 className="text-lg">Quiz Room: {quizId}</h2>
        <span>Participants: {participants}</span>
      </header>

      {isAdmin && (
        <div className="bg-yellow-100 text-yellow-800 text-center p-2">
          ✅ You are the host — <button className="bg-green-600 text-white px-2 py-1 rounded ml-2" onClick={startQuiz}>Start Quiz</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
        {currentQuestion ? (
          <div>
            <h3 className="text-xl font-semibold mb-2">{currentQuestion.question}</h3>
            <div className="mb-2">⏱️ Time Left: {timeLeft}s</div>
            {currentQuestion.options.map((opt, idx) => (
              <div
                key={idx}
                className={`p-2 border rounded mb-2 cursor-pointer ${
                  selectedAnswer === idx
                    ? idx === currentQuestion.correctIndex
                      ? 'bg-green-300'
                      : 'bg-red-300'
                    : 'bg-white'
                }`}
                onClick={() => handleAnswer(idx)}
              >
                {opt} {voteStats[idx] !== undefined ? `(${voteStats[idx]} votes)` : ''}
              </div>
            ))}
          </div>
        ) : leaderboard.length > 0 ? (
          <div>
            <h3 className="text-xl font-bold mb-4">🏆 Final Leaderboard</h3>
            <ul>
              {leaderboard.map((entry, i) => (
                <li key={i} className="mb-2">
                  {i + 1}. {entry.username} — {entry.score} pts
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mb-4">Waiting for quiz to start...</div>
        )}

        <div className="border-t pt-4 mt-4">
          <h4 className="font-semibold mb-2">Live Chat</h4>
          {messages.map((msg, idx) => (
            <div key={idx} className="mb-2">
              <strong>{msg.username}:</strong> {msg.message}
            </div>
          ))}
        </div>
      </div>

      <footer className="p-4 bg-white flex">
        <input
          className="flex-1 border p-2"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button className="ml-2 bg-green-500 text-white p-2 rounded" onClick={sendMessage}>
          Send
        </button>
      </footer>
    </div>
  );
}
