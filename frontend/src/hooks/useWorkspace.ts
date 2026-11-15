import { useEffect, useState } from 'react';
import { Workspace } from '../types';
import { createWorkspace, getCurrentWorkspace } from '../lib/api';

export function useWorkspace(role: 'caller' | 'operator' = 'caller') {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);

        // Check if token was provided in URL query parameters (e.g. from Paired Command Center link)
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('token');
        const urlRole = params.get('role');

        if (urlToken) {
          if (urlRole === 'operator' || role === 'operator') {
            localStorage.setItem('responseos_operator_token', urlToken);
          } else {
            localStorage.setItem('responseos_caller_token', urlToken);
          }
        }

        // Try getting existing workspace context
        try {
          const current = await getCurrentWorkspace(role);
          setWorkspace(current);
          setLoading(false);
          return;
        } catch {
          // No active workspace, create a new isolated sandbox
        }

        // Create new isolated workspace
        const created = await createWorkspace();
        setWorkspace(created);
      } catch (err: any) {
        setError(err.message || 'Failed to initialize workspace');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [role]);

  return { workspace, loading, error, setWorkspace };
}
