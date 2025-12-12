import { useState, useEffect } from 'react';
import { Persona } from '../types/personas';
import { personasApi } from '../api/personas';

export function usePersonas() {
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadPersonas();
    }, []);

    const loadPersonas = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await personasApi.getAll();
            setPersonas(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load personas');
            console.error('Error loading personas:', err);
        } finally {
            setLoading(false);
        }
    };

    const createPersona = async (data: any) => {
        try {
            setLoading(true);
            const newPersona = await personasApi.create(data);
            setPersonas(prev => [newPersona, ...prev]);
            return newPersona;
        } catch (err: any) {
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        personas,
        loading,
        error,
        refetch: loadPersonas,
        createPersona
    };
}
