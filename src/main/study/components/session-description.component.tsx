import Input from '@/components/form/input';
import Tags from '@/components/form/tags';
import Loading from '@/components/loading/loading';

import parseHTML from '../services/parseHTML';
import { useSession } from '../session/session.context';

import Tabs from './tabs';

import s from './session-description.module.scss';

export default function SessionDescription() {
  const { question, autoplayAudio, synonyms, sendQuestionDataToServer, note } = useSession()!;

  return (
    <div class={`card ${s.description}`}>
      <Loading when={question()}>
        <Tabs>
          {parseHTML(question()!.data.description, autoplayAudio())}
          <div data-tab='Заметки и синонимы'>
            Синонимы:
            <br />
            <Tags
              value={synonyms}
              placeholder='Синонимы, которые будут защитываться, как правильные ответы'
              onChange={sendQuestionDataToServer}
            />
            <br />
            Заметки:
            <br />
            <Input value={note} multiline placeholder='Место для ваших заметок' onChange={sendQuestionDataToServer} />
          </div>
        </Tabs>
      </Loading>
    </div>
  );
}