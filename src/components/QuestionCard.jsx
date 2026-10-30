import { useEffect, useRef, useState } from 'react';
import Glossed from './Glossed.jsx';
import { LETTERS } from './Explanation.jsx';
import { checkNumeric, formatNumber } from '../engine/answerCheck.js';

// One question: prompt + options (or a number box). Nothing about the answer is shown until
// `revealed` is true. Options keep the paper's order: many say "all of the above" or "both A and B".
//   given     the answer so far (option index, or typed text for numeric), or null
//   onAnswer  called with the answer when the user taps an option or submits a number;
//             omit it to show the question read-only
//   live      exam mode: a typed number is reported on every keystroke (no submit needed)
export default function QuestionCard({ q, given, revealed, onAnswer, numberFormId, live }) {
  return (
    <>
      <h1 className="question-text">
        <Glossed text={q.prompt} />
      </h1>
      {q.type === 'numeric' ? (
        <NumericAnswer q={q} given={given} revealed={revealed} onAnswer={onAnswer} formId={numberFormId} live={live} />
      ) : (
        <div className="stack" role="group" aria-label="Options">
          {q.options.map((text, i) => {
            let cls = 'option';
            if (revealed) {
              if (i === q.answer.index) cls += ' correct';
              else if (i === given) cls += ' wrong';
              else cls += ' dim';
            } else if (i === given) cls += ' selected';
            return (
              <button
                key={i}
                className={cls}
                onClick={() => onAnswer && onAnswer(i)}
                disabled={revealed || !onAnswer}
                aria-pressed={i === given}
              >
                <span className="letter">{LETTERS[i]}</span>
                <span className="txt">{text}</span>
                {revealed && i === q.answer.index && <span className="opt-mark correct">✓</span>}
                {revealed && i === given && i !== q.answer.index && <span className="opt-mark wrong">✗</span>}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

function NumericAnswer({ q, given, revealed, onAnswer, formId, live }) {
  const [value, setValue] = useState(given ?? '');
  const ref = useRef(null);
  useEffect(() => {
    if (!revealed && onAnswer) ref.current?.focus({ preventScroll: true });
  }, [revealed, onAnswer]);
  const check = revealed ? checkNumeric(q, given ?? '') : null;
  const unit = q.answer.unit;
  return (
    <form
      id={formId}
      className="field"
      onSubmit={(e) => {
        e.preventDefault();
        if (!revealed && onAnswer && value.trim()) onAnswer(value.trim());
      }}
    >
      <label htmlFor={`num-${q.id}`}>Your answer{unit ? ` (${unit})` : ''}</label>
      <div className={`num-input ${revealed ? (check.correct ? 'correct' : 'wrong') : ''}`}>
        <input
          id={`num-${q.id}`}
          ref={ref}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (live && onAnswer) onAnswer(e.target.value.trim() || null);
          }}
          readOnly={revealed || !onAnswer}
          enterKeyHint="done"
        />
        {unit && <div className="suffix">{unit}</div>}
      </div>
      {revealed && !check.correct && (
        <div className="caption">
          Correct value: <b className="mono">{formatNumber(q.answer.value, unit)}</b>
          {q.answer.tolerance ? ` (± ${q.answer.tolerance} accepted)` : ''}
        </div>
      )}
    </form>
  );
}
