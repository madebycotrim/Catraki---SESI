import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../lib/api.ts';
import type { Institution } from '../lib/types.ts';

/**
 * Hook customizado para encapsular a recuperação assíncrona e filtragem das instituições de ensino.
 * Princípio SOLID: Separação de responsabilidades (SRP) — a lógica de dados não polui a camada de apresentação.
 */
export function useSchoolList() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchSchools = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiClient.getPublicInstitutions();
        if (isMounted) {
          if (res.success && Array.isArray(res.institutions)) {
            setInstitutions(res.institutions);
          } else {
            setError('Não foi possível listar as escolas participantes no momento.');
          }
        }
      } catch {
        if (isMounted) {
          setError('Erro de conexão ao carregar as unidades escolares.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSchools();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredInstitutions = useMemo(() => {
    if (!searchTerm.trim()) return institutions;
    const term = searchTerm.toLowerCase();
    return institutions.filter(
      (inst) =>
        inst.name.toLowerCase().includes(term) ||
        inst.short_name.toLowerCase().includes(term) ||
        inst.city.toLowerCase().includes(term) ||
        inst.id.toLowerCase().includes(term)
    );
  }, [institutions, searchTerm]);

  return {
    institutions,
    filteredInstitutions,
    loading,
    error,
    searchTerm,
    setSearchTerm,
  };
}
