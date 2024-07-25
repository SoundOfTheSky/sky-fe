import { useNavigate, useParams } from '@solidjs/router';
import { Component, onMount } from 'solid-js';

import authStore from '@/services/auth.store';

export default (() => {
  // === Hooks ===
  const navigate = useNavigate();
  const params = useParams<{ key: string }>();

  onMount(async () => {
    if (params.key) await authStore.register({ key: params.key });
    navigate('../profile');
  });

  return <div />;
}) as Component;
