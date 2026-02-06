// components/auth/user-selector.tsx
'use client';

import { useState, useEffect } from 'react';
import { PersonCircle, Check, LogIn } from 'react-bootstrap-icons';

interface User {
  id: string;
  username: string;
  first_name: string;
  balance: number;
}

interface UserSelectorProps {
  onUserSelect: (user: User) => void;
}

export function UserSelector({ onUserSelect }: UserSelectorProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/auth/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
        
        // Check localStorage for previously selected user
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          const foundUser = data.users.find((u: User) => u.id === user.id);
          if (foundUser) {
            setSelectedUser(foundUser);
            onUserSelect(foundUser);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    onUserSelect(user);
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <PersonCircle /> Select User Account
      </h3>
      
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {users.map((user) => (
          <div
            key={user.id}
            className={`p-3 border rounded-lg cursor-pointer transition-all ${
              selectedUser?.id === user.id
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 hover:border-indigo-300'
            }`}
            onClick={() => handleUserSelect(user)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{user.first_name}</p>
                <p className="text-sm text-gray-600">@{user.username}</p>
                <p className="text-xs text-gray-500">ID: {user.id.substring(0, 8)}...</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-600">${user.balance.toFixed(2)}</p>
                {selectedUser?.id === user.id && (
                  <div className="flex items-center gap-1 text-indigo-600 text-sm mt-1">
                    <Check size={14} /> Active
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Selected: <span className="font-semibold">
            {selectedUser ? `${selectedUser.first_name} (@${selectedUser.username})` : 'None'}
          </span>
        </p>
      </div>
    </div>
  );
}