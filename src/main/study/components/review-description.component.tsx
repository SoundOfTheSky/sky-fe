import Loading from '@/components/loading/loading';
import Tags from '@/components/form/tags';
import Tabs from './tabs';
import parseHTML from '../services/parseHTML';
import { useReview } from '../session/services/review.context';

import s from './review-description.module.scss';
import Input from '@/components/form/input';

export default function ReviewDescription() {
  const { questionDescription, autoplayAudio, synonyms, sendQuestionDataToServer, note } = useReview()!;

  return (
    <div class={`card ${s.description}`}>
      <Loading when={questionDescription()}>
        <Tabs>
          {parseHTML(questionDescription()!, autoplayAudio())}
          <div data-tab='Notes & Synonyms'>
            Synonyms:
            <br />
            <Tags
              value={synonyms}
              placeholder='Your synonyms will count as correct answers'
              onChange={sendQuestionDataToServer}
            />
            <br />
            Note:
            <br />
            <Input
              value={note}
              multiline
              placeholder='Add your note to this question'
              onChange={sendQuestionDataToServer}
            />
          </div>
        </Tabs>
      </Loading>
    </div>
  );
}
