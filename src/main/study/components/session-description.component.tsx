import Input from '@/components/form/input'
import Tags from '@/components/form/tags'
import Skeleton from '@/components/loading/skeleton'
import basicStore from '@/services/basic.store'

import parseHTML from '../services/parse-html'
import { useSession } from '../session/session.context'

import Tabs from './tabs'

import s from './session-description.module.scss'

const { t } = basicStore
export default function SessionDescription() {
  const { question, autoplayAudio, synonyms, sendQuestionDataToServer, note }
    = useSession()!

  return (
    <div class={`card ${s.description}`}>
      <Skeleton loading={!question() || question.loading}>
        <Tabs>
          {parseHTML(question()!.data.description, autoplayAudio())}
          <div data-tab={t('STUDY.SESSION.QUESTION_DATA')}>
            {t('STUDY.SESSION.SYNONYMS')}
            :
            <br />
            <Tags
              value={synonyms}
              placeholder={t('STUDY.SESSION.SYNONYMS_DESC')!}
              onChange={sendQuestionDataToServer}
            />
            <br />
            {t('STUDY.SESSION.NOTES')}
            :
            <br />
            <Input
              value={note}
              multiline
              placeholder={t('STUDY.SESSION.NOTES_DESC')}
              onChange={sendQuestionDataToServer}
            />
          </div>
        </Tabs>
      </Skeleton>
    </div>
  )
}
