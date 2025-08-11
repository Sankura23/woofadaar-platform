'use client';

import { useState } from 'react';

export default function RecreateUsersPage() {
  const [users, setUsers] = useState([
    { email: 'chitnissanket@gmail.com', name: 'Sanket', password: '', created: false },
    { email: 'sakshi@ybsdigital.com', name: 'Sakshi', password: '', created: false }
  ]);

  const [isCreating, setIsCreating] = useState(false);

  const updateUser = (index: number, field: string, value: string) => {
    const newUsers = [...users];
    newUsers[index] = { ...newUsers[index], [field]: value };
    setUsers(newUsers);
  };

  const addUser = () => {
    setUsers([...users, { email: '', name: '', password: '', created: false }]);
  };

  const createUser = async (userIndex: number) => {
    const user = users[userIndex];
    
    if (!user.email || !user.name || !user.password) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch('/api/admin/recreate-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          password: user.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const newUsers = [...users];
        newUsers[userIndex].created = true;
        setUsers(newUsers);
        alert(`User ${user.email} created successfully!`);
      } else {
        alert(`Failed to create user: ${data.error}`);
      }
    } catch (error) {
      alert(`Network error: ${error.message}`);
    }
  };

  const createAllUsers = async () => {
    setIsCreating(true);
    
    for (let i = 0; i < users.length; i++) {
      if (!users[i].created) {
        await createUser(i);
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    setIsCreating(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Recreate Lost User Accounts</h1>
          
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">
              <strong>Note:</strong> The gamification schema changes caused user data loss. 
              This tool helps recreate the accounts that were lost.
            </p>
          </div>

          <div className="space-y-4 mb-6">
            {users.map((user, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-lg">
                <input
                  type="email"
                  placeholder="Email"
                  value={user.email}
                  onChange={(e) => updateUser(index, 'email', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={user.created}
                />
                
                <input
                  type="text"
                  placeholder="Name"
                  value={user.name}
                  onChange={(e) => updateUser(index, 'name', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={user.created}
                />
                
                <input
                  type="password"
                  placeholder="Password"
                  value={user.password}
                  onChange={(e) => updateUser(index, 'password', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={user.created}
                />
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => createUser(index)}
                    disabled={user.created || isCreating}
                    className={`px-4 py-2 rounded-md font-medium ${
                      user.created 
                        ? 'bg-green-100 text-green-800 cursor-not-allowed' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50'
                    }`}
                  >
                    {user.created ? '✓ Created' : 'Create'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex space-x-4">
            <button
              onClick={addUser}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md font-medium"
            >
              Add Another User
            </button>
            
            <button
              onClick={createAllUsers}
              disabled={isCreating}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md font-medium disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create All Users'}
            </button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">After Recreation:</h3>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Users can log in with their original email and new password</li>
              <li>• They'll need to recreate their dog profiles</li>
              <li>• Community posts and data may need to be reassociated</li>
              <li>• Consider implementing proper database migrations for future schema changes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}