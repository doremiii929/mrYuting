const byId = id => document.getElementById(id);
const audio = new Audio();
let sceneIndex = 0;
let questionIndex = 0;
let answers = [];
let track = 'original';
let loaded = '';
let request = 0;
let openQuiz = false;
let slow = false;
let moving = !matchMedia('(prefers-reduced-motion: reduce)').matches;
let frameId = 0;
const stage = new StoryStage(byId('stage'));

const steps = scenes.map((scene, index) => {
  const button = document.createElement('button');
  button.textContent = index + 1;
  button.setAttribute('aria-label', `第 ${index + 1} 節，${scene.title}`);
  button.onclick = () => renderScene(index, true);
  byId('steps').append(button);
  return button;
});

function updatePlayer() {
  const playing = !audio.paused && !audio.ended;
  byId('play').textContent = playing && track === 'original' ? '❚❚ 暫停' : '▶ 播放';
  byId('plain-play').textContent = playing && track === 'plain' ? '❚❚ 暫停白話' : '🔊 聽白話';
  byId('plain-play').setAttribute('aria-pressed', String(playing && track === 'plain'));
  for (const button of byId('words').querySelectorAll('button')) {
    const activeWord = track === button.dataset.track && playing;
    button.textContent = activeWord ? '暫停' : '🔊 聽詞語';
    button.setAttribute('aria-pressed', String(activeWord));
  }
  byId('stage').hidden = !moving;
  byId('illustration').hidden = moving;
  syncAnimation();
  byId('motion').setAttribute('aria-pressed', String(!moving));
  byId('motion').textContent = moving ? '關閉動畫' : '開啟動畫';
  const times = window.cues?.[sceneIndex] || [];
  let active = -1;
  if (loaded && track === 'original' && !audio.ended) {
    active = times.findLastIndex(time => audio.currentTime >= time);
  }
  [...byId('original').children].forEach((line, index) => line.classList.toggle('active', index === active));
}

function syncAnimation() {
  cancelAnimationFrame(frameId);
  if (!moving) return;
  const storyTrack = loaded && (track === 'original' || track === 'plain');
  const time = storyTrack && Number.isFinite(audio.duration) && audio.duration > 0
    ? audio.currentTime / audio.duration
    : 0;
  stage.draw(sceneIndex, time);
  if (storyTrack && !audio.paused && !audio.ended) {
    frameId = requestAnimationFrame(syncAnimation);
  }
}

function resetAudio() {
  request++;
  audio.pause();
  loaded = '';
  audio.removeAttribute('src');
  audio.load();
  byId('status').textContent = '';
  updatePlayer();
}

async function play(kind, restart = false) {
  const file = `audio/${sceneIndex + 1}-${kind}.mp3`;
  if (file === loaded && !audio.paused && !restart) {
    audio.pause();
    return;
  }
  const version = ++request;
  byId('status').textContent = '';
  if (loaded !== file) {
    loaded = file;
    track = kind;
    audio.src = file;
  } else if (restart || audio.ended) {
    audio.currentTime = 0;
  }
  audio.playbackRate = slow ? .8 : 1;
  try {
    await audio.play();
  } catch {
    if (version !== request) return;
    resetAudio();
    byId('status').textContent = '音訊暫時無法播放，請再試一次。';
  }
}

function renderScene(index, focus = false) {
  resetAudio();
  sceneIndex = index;
  const scene = scenes[index];
  const image = byId('illustration');
  image.src = `img/${index + 1}.webp`;
  image.alt = scene.alt;
  byId('stage').setAttribute('aria-label', scene.alt);
  byId('number').textContent = `第 ${index + 1} 幕／共 ${scenes.length} 幕`;
  byId('scene-title').textContent = scene.title;
  byId('plain').textContent = scene.plain;
  byId('clue').textContent = scene.clue;
  byId('original').replaceChildren(...scene.lines.map(text => {
    const line = document.createElement('span');
    line.textContent = text;
    return line;
  }));
  byId('words').replaceChildren(...scene.words.map(([word, meaning], wordIndex) => {
    const row = document.createElement('div');
    row.className = 'word-row';
    const term = document.createElement('dt');
    const definition = document.createElement('dd');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '🔊 聽詞語';
    button.dataset.track = `word-${wordIndex + 1}`;
    button.setAttribute('aria-label', `聽「${word}」的詞語解釋`);
    button.setAttribute('aria-pressed', 'false');
    button.onclick = () => play(button.dataset.track);
    const label = document.createElement('span');
    label.textContent = word;
    term.append(label, button);
    definition.textContent = meaning;
    row.append(term, definition);
    return row;
  }));
  steps.forEach((button, i) => button.setAttribute('aria-current', String(i === index)));
  byId('previous').disabled = index === 0;
  byId('next').textContent = index === scenes.length - 1 ? '去小測驗 ›' : '下一節 ›';
  syncAnimation();
  if (focus) byId('scene-title').focus({ preventScroll: true });
}

function switchView(quiz, focus = true) {
  resetAudio();
  openQuiz = quiz;
  byId('quiz').hidden = !quiz;
  byId('story').hidden = quiz;
  for (const tab of ['story', 'quiz']) {
    byId(`${tab}-tab`).setAttribute('aria-pressed', String(quiz === (tab === 'quiz')));
  }
  if (quiz) renderQuiz(focus);
  else if (focus) byId('scene-title').focus();
}

function renderQuiz(focus = false) {
  const complete = questionIndex === questions.length;
  const options = byId('options');
  options.replaceChildren();
  byId('review').hidden = true;
  byId('advance').hidden = true;
  byId('restart').hidden = !complete;
  byId('feedback').textContent = '';
  if (complete) {
    const score = answers.filter((answer, index) => answer === questions[index][2]).length;
    byId('quiz-progress').textContent = '完成小測驗';
    byId('question').textContent = `你答對了 ${score}／${questions.length} 題！`;
    byId('feedback').textContent = score === questions.length
      ? '你找到了百獸逃跑的真正原因，也懂得這個成語怎麼用。'
      : '可以回到課文重看，再挑戰一次。';
  } else {
    const [question, choices, correct, explanation, scene] = questions[questionIndex];
    byId('quiz-progress').textContent = `第 ${questionIndex + 1} 題／共 ${questions.length} 題`;
    byId('question').textContent = question;
    const chosen = answers[questionIndex];
    choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.textContent = choice;
      button.onclick = () => {
        answers[questionIndex] = index;
        renderQuiz();
        byId('feedback').focus();
      };
      if (chosen !== undefined) {
        button.disabled = true;
        if (index === correct) button.className = 'correct';
        else if (index === chosen) button.className = 'incorrect';
      }
      options.append(button);
    });
    if (chosen !== undefined) {
      byId('feedback').textContent = (chosen === correct ? '答對了！' : '一起看看故事怎麼說。') + explanation;
      byId('review').hidden = false;
      byId('review').onclick = () => {
        switchView(false, false);
        renderScene(scene, true);
      };
      byId('advance').hidden = false;
      byId('advance').textContent = questionIndex === questions.length - 1 ? '看結果 ›' : '下一題 ›';
    }
  }
  if (focus) byId('question').focus();
}

byId('feedback').tabIndex = -1;
byId('story-tab').onclick = () => { if (openQuiz) switchView(false); };
byId('quiz-tab').onclick = () => { if (!openQuiz) switchView(true); };
byId('previous').onclick = () => renderScene(sceneIndex - 1, true);
byId('next').onclick = () => sceneIndex === scenes.length - 1 ? switchView(true) : renderScene(sceneIndex + 1, true);
byId('play').onclick = () => play('original');
byId('replay').onclick = () => play('original', true);
byId('plain-play').onclick = () => play('plain');
byId('speed').onclick = () => {
  slow = !slow;
  byId('speed').setAttribute('aria-pressed', String(slow));
  audio.playbackRate = slow ? .8 : 1;
};
byId('motion').onclick = () => { moving = !moving; updatePlayer(); };
byId('advance').onclick = () => { questionIndex++; renderQuiz(true); };
byId('restart').onclick = () => { answers = []; questionIndex = 0; renderQuiz(true); };
for (const event of ['play', 'pause', 'loadedmetadata', 'timeupdate', 'ended']) audio.addEventListener(event, updatePlayer);
audio.addEventListener('ended', () => {
  byId('status').textContent = track === 'original' ? '本節播放完畢。' : track === 'plain' ? '白話解釋播放完畢。' : '詞語解釋播放完畢。';
});
renderScene(0);
