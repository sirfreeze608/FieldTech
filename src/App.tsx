import React, { useState, useEffect } from 'react';
import { AuthGuard } from './components/AuthGuard';
import { Layout } from './components/Layout';
import { OrgOnboarding } from './components/OrgOnboarding';
import { useStore } from './store/useStore';
import { Home } from './pages/Home';
import { Tickets } from './pages/Tickets';
import { Maps } from './pages/Maps';
import { Chat } from './pages/Chat';
import { Profile } from './pages/Profile';
import { AccountSettings } from './pages/AccountSettings';
import { InviteTech } from './pages/InviteTech';
import { TimeManagement } from './pages/TimeManagement';
import { EnterpriseSuite } from './pages/EnterpriseSuite';
import { Trades } from './pages/Trades';
import { Assets } from './pages/Assets';
import { TradeId } from './lib/trades';
import { useAssets, Asset } from './hooks/useAssets';
import { useTickets, Ticket } from './hooks/useTickets';
import { useSites } from './hooks/useSites';
import { QrScannerModal } from './components/QrScannerModal';
import { AssetDetailsModal } from './components/AssetDetailsModal';
import { TicketDetails } from './components/TicketDetails';

type Page = 'home' | 'tickets' | 'assets' | 'trades' | 'maps' | 'chat' | 'profile' | 'settings' | 'invite' | 'time' | 'enterprise';

function AppWorkspace() {
  const { user } = useStore();
  const [activeTab, setActiveTab] = useState<Page>('home');
  const [selectedTrade, setSelectedTrade] = useState<TradeId | undefined>(undefined);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedAsset, setScannedAsset] = useState<Asset | null>(null);
  const [scannedTicket, setScannedTicket] = useState<Ticket | null>(null);
  const [prefillAssetQr, setPrefillAssetQr] = useState<string | null>(null);

  const { assets } = useAssets(user?.orgCode);
  const { tickets } = useTickets(undefined, user?.orgCode);
  const { sites } = useSites(user?.orgCode);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const assetParam = params.get('assetId');
    const ticketParam = params.get('ticketId');

    if (ticketParam && tickets.length > 0) {
      const found = tickets.find((t) => t.id === ticketParam);
      if (found) {
        setScannedTicket(found);
      }
    } else if (assetParam && assets.length > 0) {
      const found = assets.find((a) => a.id === assetParam || a.assetTag === assetParam);
      if (found) {
        setScannedAsset(found);
      }
    }
  }, [assets, tickets]);

  const navigate = (page: Page, tradeId?: TradeId) => {
    if (tradeId) setSelectedTrade(tradeId);
    setActiveTab(page);
  };

  const handleRegisterNewAssetFromQr = (qrCodeValue: string) => {
    setPrefillAssetQr(qrCodeValue);
    setActiveTab('assets');
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return (
          <Home
            onOpenTrades={(t) => navigate('trades', t)}
            onNavigate={(p) => navigate(p as Page)}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        );
      case 'tickets':
        return <Tickets onOpenScanner={() => setIsScannerOpen(true)} />;
      case 'assets':
        return (
          <Assets
            onOpenScanner={() => setIsScannerOpen(true)}
            prefillQr={prefillAssetQr}
            onClearPrefillQr={() => setPrefillAssetQr(null)}
          />
        );
      case 'trades':
        return <Trades initialTrade={selectedTrade} onNavigateTickets={() => navigate('tickets')} />;
      case 'maps':
        return <Maps />;
      case 'chat':
        return <Chat />;
      case 'time':
        return <TimeManagement />;
      case 'profile':
        return <Profile onNavigate={navigate} />;
      case 'settings':
        return <AccountSettings onBack={() => navigate('profile')} />;
      case 'invite':
        return <InviteTech onBack={() => navigate('profile')} />;
      case 'enterprise':
        return <EnterpriseSuite onBack={() => navigate('profile')} />;
      default:
        return (
          <Home
            onOpenTrades={(t) => navigate('trades', t)}
            onNavigate={(p) => navigate(p as Page)}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        );
    }
  };

  const tabValue = ['settings', 'invite', 'enterprise'].includes(activeTab) ? 'profile' : activeTab;

  return (
    <>
      <Layout
        activeTab={tabValue}
        setActiveTab={(tab) => navigate(tab as Page)}
        onOpenScanner={() => setIsScannerOpen(true)}
      >
        {renderPage()}
      </Layout>

      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        assets={assets}
        tickets={tickets}
        onOpenAsset={(asset) => {
          setScannedTicket(null);
          setScannedAsset(asset);
        }}
        onOpenTicket={(ticket) => {
          setScannedAsset(null);
          setScannedTicket(ticket);
        }}
        onRegisterNewAsset={handleRegisterNewAssetFromQr}
      />

      {scannedAsset && (
        <AssetDetailsModal
          asset={scannedAsset}
          sites={sites}
          tickets={tickets}
          onClose={() => setScannedAsset(null)}
          onOpenTicket={(ticket) => {
            setScannedAsset(null);
            setScannedTicket(ticket);
          }}
        />
      )}

      {scannedTicket && (
        <TicketDetails
          ticket={scannedTicket}
          onClose={() => setScannedTicket(null)}
        />
      )}
    </>
  );
}

export default function App() {
  const { user, theme } = useStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <AuthGuard>
      {user?.orgCode === 'DEFAULT' ? <OrgOnboarding /> : <AppWorkspace />}
    </AuthGuard>
  );
}
