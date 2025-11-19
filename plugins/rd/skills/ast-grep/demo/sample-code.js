// Sample JavaScript code with various patterns for ast-grep demonstration

// Example 1: Async functions with different patterns
async function fetchUser(userId) {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
}

async function fetchUserWithoutAwait(userId) {
  return fetch(`/api/users/${userId}`);
}

async function fetchUserWithTryCatch(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}

// Example 2: Console statements
function debugUser(user) {
  console.log('User data:', user);
  console.warn('This is a warning');
  console.error('This is an error');

  if (user.id) {
    console.log('User ID:', user.id);
  }
}

// Example 3: Promise.all with await
async function loadMultipleUsers() {
  const users = await Promise.all([
    await fetch('/api/users/1'),
    await fetch('/api/users/2'),
    await fetch('/api/users/3')
  ]);
  return users;
}

// Example 4: Class with methods
class UserService {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
  }

  async getUser(id) {
    console.log('Fetching user:', id);
    const response = await fetch(`${this.apiUrl}/users/${id}`);
    return response.json();
  }

  updateUser(id, data) {
    console.log('Updating user:', id);
    return fetch(`${this.apiUrl}/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
}

// Example 5: Variable declarations
var oldStyleVar = 'should be let or const';
let modernLet = 'good';
const modernConst = 'also good';
var anotherOldVar = 42;

// Example 6: Function with multiple arguments
function logger(level, message, data) {
  console.log(`[${level}] ${message}`, data);
}

logger('INFO', 'User logged in', { userId: 123 });
logger('ERROR', 'Failed to save');
logger('DEBUG', 'Processing', { step: 1, total: 10 });
