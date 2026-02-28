import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/games');
  }, []);

  return (
    <Head>
      <meta name="verification" content="52c409f1571f500e28f490a302a12540" />
    </Head>
  );
}
