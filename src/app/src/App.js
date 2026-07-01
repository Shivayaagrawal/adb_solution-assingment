import { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:8000/todos/';

async function fetchTodos() {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error('Failed to load todos.');
  }

  return response.json();
}

async function createTodo(description) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ description }),
  });

  if (!response.ok) {
    throw new Error('Failed to create todo.');
  }

  return response.json();
}

export function App() {
  const [todos, setTodos] = useState([]);
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTodos = async () => {
    setError('');

    try {
      const data = await fetchTodos();
      setTodos(data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTodos();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await createTodo(trimmedDescription);
      setDescription('');
      await loadTodos();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="App">
      <div>
        <h1>List of TODOs</h1>
        {isLoading && <p>Loading todos...</p>}
        {error && <p>{error}</p>}
        {!isLoading && !error && todos.length === 0 && <p>No todos yet.</p>}
        {!isLoading && todos.length > 0 && (
          <ul>
            {todos.map((todo) => (
              <li key={todo.id}>{todo.description}</li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h1>Create a ToDo</h1>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="todo">ToDo: </label>
            <input
              id="todo"
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div style={{ marginTop: '5px' }}>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add ToDo!'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
