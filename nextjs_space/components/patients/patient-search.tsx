'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PatientSearchProps {
  onSearch: (term: string) => void;
  placeholder?: string;
}

export default function PatientSearch({ onSearch, placeholder = 'Buscar paciente...' }: PatientSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleChange = (value: string) => {
    setSearchTerm(value);
    onSearch(value);
  };

  const handleClear = () => {
    setSearchTerm('');
    onSearch('');
  };

  return (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      <Input
        value={searchTerm}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-10"
      />
      {searchTerm && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
          onClick={handleClear}
        >
          <X className="w-4 h-4 text-gray-400" />
        </Button>
      )}
    </div>
  );
}
