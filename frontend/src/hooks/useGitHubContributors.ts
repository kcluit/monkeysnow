import { useState, useEffect } from 'react';

interface Contributor {
  login: string;
}

// Module-level cache for request deduplication
let cachedContributors: string[] | null = null;
let pendingRequest: Promise<string[]> | null = null;

async function fetchContributors(): Promise<string[]> {
  const contributors: string[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/repos/kcluit/monkeysnow/contributors?per_page=100&page=${page}`
    );
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const data: Contributor[] = await res.json();
    if (data.length === 0) break;
    contributors.push(...data.map((c) => c.login));
    if (data.length < 100) break;
    page++;
  }

  return contributors;
}

export function useGitHubContributors(): {
  contributors: string[];
  loading: boolean;
  error: Error | null;
} {
  const [contributors, setContributors] = useState<string[]>(cachedContributors ?? []);
  const [loading, setLoading] = useState(!cachedContributors);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (cachedContributors) {
      setContributors(cachedContributors);
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!pendingRequest) {
          pendingRequest = fetchContributors();
        }

        const data = await pendingRequest;
        cachedContributors = data;
        pendingRequest = null;
        setContributors(data);
      } catch (err) {
        pendingRequest = null;
        setError(err instanceof Error ? err : new Error('Failed to fetch contributors'));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { contributors, loading, error };
}
