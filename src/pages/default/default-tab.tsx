import Chat from './components/chat';
import About from './components/about';
import Visitors from './components/server-stats';
import Welcome from './components/welcome';

export default function DefaultTab() {
  return (
    <div class='card-container'>
      <Welcome />
      <About />
      <Visitors />
      <Chat />
    </div>
  );
}
