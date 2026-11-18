// Each action uses the narration's progress so it pauses and slows with the audio.
const spriteFiles = ['fox', 'fox-talk', 'fox-step', 'tiger', 'tiger-step', 'rabbit', 'deer', 'bird'];

class StoryStage {
  constructor(element) {
    this.element = element;
    this.sprites = {};
    for (const asset of spriteFiles) {
      const image = new Image();
      image.src = `img/stage/${asset}.webp`;
    }
    for (const actor of ['tiger', 'fox', 'rabbit', 'deer', 'bird']) {
      const image = document.createElement('img');
      image.className = `actor actor-${actor}`;
      image.alt = '';
      image.hidden = true;
      element.append(image);
      this.sprites[actor] = image;
    }
    this.mark = document.createElement('span');
    this.mark.className = 'thought';
    this.mark.textContent = '？';
    this.mark.hidden = true;
    this.mark.setAttribute('aria-hidden', 'true');
    element.append(this.mark);
  }

  place(actor, frame, x, y, direction = 1, tilt = 0) {
    const image = this.sprites[actor];
    image.hidden = false;
    if (image.dataset.frame !== frame) {
      image.src = `img/stage/${frame}.webp`;
      image.dataset.frame = frame;
    }
    image.style.left = `${x}%`;
    image.style.bottom = `${y}%`;
    image.style.transform = `translateX(-50%) scaleX(${direction}) rotate(${tilt}deg)`;
  }

  draw(scene, progress) {
    const time = Math.min(1, Math.max(0, progress));
    const walk = Math.floor(time * 20) % 2;
    const bob = Math.abs(Math.sin(time * Math.PI * 10));
    const foxStep = walk ? 'fox-step' : 'fox';
    const tigerStep = walk ? 'tiger-step' : 'tiger';
    for (const animal of ['rabbit', 'deer', 'bird']) this.sprites[animal].hidden = scene !== 4;
    this.mark.hidden = scene !== 5 || time < .24;
    const advance = (start, end) => Math.min(1, Math.max(0, (time - start) / (end - start)));

    switch (scene) {
      case 0: {
        const approach = advance(0, .77);
        this.place('tiger', approach < 1 ? tigerStep : 'tiger', 20 + 16 * approach, 13 + bob * (1 - approach));
        this.place('fox', 'fox', 70 - 3 * approach, 12 + 4 * Math.sin(approach * Math.PI), -1);
        break;
      }
      case 1:
      case 2: {
        const talking = time > 0 && time < .99 && Math.floor(time * (scene === 1 ? 36 : 32)) % 3 !== 0;
        const turn = scene === 2 && time > .83;
        this.place('tiger', 'tiger', 33, 13, 1, 3 * Math.sin(time * Math.PI * 3));
        this.place('fox', talking ? 'fox-talk' : 'fox', 68 + (turn ? 7 * advance(.83, 1) : 0), 12, turn ? 1 : -1);
        break;
      }
      case 3:
        this.place('tiger', tigerStep, 23 + 34 * advance(.20, 1), 13 + bob);
        this.place('fox', foxStep, 48 + 35 * time, 12 + bob * 1.5);
        break;
      case 4: {
        const flee = advance(.19, 1);
        this.place('tiger', tigerStep, 20 + 15 * time, 13 + bob);
        this.place('fox', foxStep, 44 + 15 * time, 12 + bob);
        this.place('rabbit', 'rabbit', 68 + 45 * flee, 11 + Math.abs(Math.sin(flee * Math.PI * 4)) * 9, 1, -10 * bob * flee);
        this.place('deer', 'deer', 81 + 43 * flee, 16 + Math.abs(Math.sin(flee * Math.PI * 3)) * 8);
        this.place('bird', 'bird', 70 + 46 * flee, 39 + 49 * flee, 1, -13 * flee);
        break;
      }
      case 5:
        this.place('tiger', 'tiger', 38, 13, 1, 7 * Math.sin(time * Math.PI * 3));
        this.place('fox', foxStep, 65 + 35 * time, 12 + bob * 1.2);
        break;
    }
  }
}
