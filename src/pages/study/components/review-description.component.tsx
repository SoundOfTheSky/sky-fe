import Loading from '@/components/loading/loading';
import Tags from '@/components/tags';
import { autoExpandTextarea, model } from '@/services/reactive';
import Tabs from './tabs';
import parseHTML from '../services/parseHTML';
import { useReview } from '../session/review.context';

import s from './review-description.module.scss';

model;
autoExpandTextarea;

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
              model={synonyms}
              placeholder='Your synonyms will count as correct answers'
              onChange={sendQuestionDataToServer}
            />
            <br />
            Note:
            <br />
            <textarea
              use:model={note}
              use:autoExpandTextarea
              placeholder='Add your note to this question'
              onChange={sendQuestionDataToServer}
            />
          </div>
        </Tabs>
      </Loading>
    </div>
  );
}
