import { MusicalKey } from '../models/enums';
import type { Spec } from '../models/spec';
import { PlayerService } from './player.service';

class FakeAudio {
  paused = true;
  src = '';
  volume = 1;
  currentTime = 0;
  duration = 0;
  crossOrigin = '';
  private listeners: Record<string, Array<() => void>> = {};

  addEventListener(event: string, cb: () => void) {
    this.listeners[event] ??= [];
    this.listeners[event].push(cb);
  }

  play() {
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }

  emit(event: string) {
    (this.listeners[event] || []).forEach((cb) => cb());
  }
}

describe('PlayerService', () => {
  const track: Spec = {
    id: 'spec-1',
    type: 'beat',
    category: 'beat',
    imageUrl: 'cover.jpg',
    title: 'Night Drive',
    bpm: 140,
    key: MusicalKey.C_MINOR,
    tags: [],
    price: 20,
    genres: [],
    licenses: [],
    audioUrl: 'track.mp3',
  };

  const originalAudio = (globalThis as any).Audio;
  const originalAudioContext = (window as any).AudioContext;
  const originalWebkitAudioContext = (window as any).webkitAudioContext;

  beforeEach(() => {
    const analyser = {
      fftSize: 0,
      frequencyBinCount: 8,
      connect: vi.fn(),
      getByteFrequencyData: vi.fn((arr: Uint8Array) => arr.fill(10)),
    };
    const source = { connect: vi.fn() };

    class FakeAudioContextImpl {
      state = 'running';
      destination = {};
      createAnalyser = vi.fn(() => analyser);
      createMediaElementSource = vi.fn(() => source);
      resume = vi.fn();
    }

    (globalThis as any).Audio = FakeAudio as any;
    (window as any).AudioContext = FakeAudioContextImpl as any;
    (window as any).webkitAudioContext = undefined;
  });

  afterEach(() => {
    (globalThis as any).Audio = originalAudio;
    (window as any).AudioContext = originalAudioContext;
    (window as any).webkitAudioContext = originalWebkitAudioContext;
  });

  it('shows player and starts playback for track with audio', () => {
    const service = new PlayerService();
    const playSpy = vi.spyOn(service, 'play');
    const audio = (service as any).audio as FakeAudio;

    service.showPlayer(track);

    expect(service.isVisible()).toBe(true);
    expect(service.currentTrack()?.id).toBe('spec-1');
    expect(audio.src).toContain('track.mp3');
    expect(playSpy).toHaveBeenCalled();
  });

  it('toggles play/pause and hides player', () => {
    const service = new PlayerService();
    const audio = (service as any).audio as FakeAudio;
    const playSpy = vi.spyOn(service, 'play');
    const pauseSpy = vi.spyOn(service, 'pause');

    audio.paused = true;
    service.togglePlay();
    expect(playSpy).toHaveBeenCalled();

    audio.paused = false;
    service.togglePlay();
    expect(pauseSpy).toHaveBeenCalled();

    service.showPlayer(track);
    service.hidePlayer();
    expect(service.isVisible()).toBe(false);
    expect(service.currentTrack()).toBeNull();
  });

  it('updates volume, seek, formatted values, and waveform data', async () => {
    const service = new PlayerService();
    const audio = (service as any).audio as FakeAudio;

    service.setVolume(2);
    expect(service.volume()).toBe(1);
    expect(service.volumeIcon()).toBe('fa-volume-high');

    service.setVolume(0.2);
    expect(service.volume()).toBe(0.2);
    expect(service.volumeIcon()).toBe('fa-volume-low');

    service.setVolume(-1);
    expect(service.volume()).toBe(0);
    expect(service.volumeIcon()).toBe('fa-volume-xmark');

    service.seekTo(42);
    expect(audio.currentTime).toBe(42);

    audio.duration = 125;
    audio.currentTime = 65;
    audio.emit('loadedmetadata');
    audio.emit('timeupdate');
    expect(service.duration()).toBe(125);
    expect(service.currentTime()).toBe(65);
    expect(service.durationFormatted()).toBe('2:05');
    expect(service.currentTimeFormatted()).toBe('1:05');

    await service.play();
    const data = service.getWaveformData();
    expect(data).not.toBeNull();
    expect(data?.length).toBeGreaterThan(0);

    audio.emit('ended');
    expect(service.isPlaying()).toBe(false);
    expect(service.currentTime()).toBe(0);
  });
});
