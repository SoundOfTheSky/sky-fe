import Input from '@/components/form/input'
import Tags from '@/components/form/tags'
import Skeleton from '@/components/loading/skeleton'

import parseHTML from '../services/parse-html'
import { useSession } from '../session/session.context'

import Tabs from './tabs'

import s from './session-description.module.scss'

export default function SessionDescription() {
  const { question, autoplayAudio, synonyms, sendQuestionDataToServer, note }
    = useSession()!

  return (
    <div class={`card ${s.description}`}>
      <Skeleton loading={!question() || question.loading}>
        <Tabs>
          {parseHTML(question()!.data.description, autoplayAudio())}
          <div data-tab="Заметки и синонимы">
            Синонимы:
            <br />
            <Tags
              value={synonyms}
              placeholder="Синонимы, которые будут засчитываться, как правильные ответы"
              onChange={sendQuestionDataToServer}
            />
            <br />
            Заметки:
            <br />
            <Input
              value={note}
              multiline
              placeholder="Место для ваших заметок"
              onChange={sendQuestionDataToServer}
            />
          </div>
        </Tabs>
      </Skeleton>
    </div>
  )
}
