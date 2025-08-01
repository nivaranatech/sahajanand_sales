import { AppProvider, useApp } from './context/AppContext';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Search from './components/Search';
import FileUpload from './components/FileUpload';
import Cart from './components/Cart';
import Bills from './components/Bills';
import Companies from './components/Companies';

function AppContent() {
  const { state } = useApp();

  const renderCurrentView = () => {
    switch (state.currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'search':
        return <Search />;
      case 'upload':
        return <FileUpload />;
      case 'cart':
        return <Cart />;
      case 'companies':
        return <Companies />;
      case 'bills':
        return <Bills />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className={`min-h-screen transition-colors ${
      state.theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <Header />
      <main className="container mx-auto px-4 py-8">
        {renderCurrentView()}
      </main>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
