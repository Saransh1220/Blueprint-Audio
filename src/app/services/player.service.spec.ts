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
    producerId: 'producer-1',
    producerName: 'Producer',
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
    processingStatus: 'completed',
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

  it('warns when showing a track without audio URL', () => {
    const service = new PlayerService();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const noAudio = { ...track, audioUrl: undefined };

    service.showPlayer(noAudio as Spec);

    expect(warnSpy).toHaveBeenCalled();
    expect(service.isVisible()).toBe(true);
    warnSpy.mockRestore();
  });

  it('returns null waveform without analyser and handles toggleMute branches', () => {
    const service = new PlayerService();

    expect(service.getWaveformData()).toBeNull();

    service.setVolume(0.7);
    service.toggleMute();
    expect(service.volume()).toBe(0);

    service.toggleMute();
    expect(service.volume()).toBe(0.7);

    service.toggleMute();
    service.setVolume(0);
    service.toggleMute();
    expect(service.volume()).toBeGreaterThan(0);
  });

  it('resumes suspended audio context and logs playback errors', async () => {
    class FakeSuspendedAudio extends FakeAudio {
      override play() {
        return Promise.reject(new Error('play failed'));
      }
    }
    const analyser = {
      fftSize: 0,
      frequencyBinCount: 8,
      connect: vi.fn(),
      getByteFrequencyData: vi.fn(),
    };
    const source = { connect: vi.fn() };
    const resume = vi.fn();
    class SuspendedAudioContextImpl {
      state = 'suspended';
      destination = {};
      createAnalyser = vi.fn(() => analyser);
      createMediaElementSource = vi.fn(() => source);
      resume = resume;
    }
    (globalThis as any).Audio = FakeSuspendedAudio as any;
    (window as any).AudioContext = SuspendedAudioContextImpl as any;
    const service = new PlayerService();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    service.play();
    await Promise.resolve();

    expect(resume).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('uses webkitAudioContext fallback and formats invalid time as 0:00', async () => {
    const analyser = {
      fftSize: 0,
      frequencyBinCount: 8,
      connect: vi.fn(),
      getByteFrequencyData: vi.fn(),
    };
    const source = { connect: vi.fn() };
    class WebkitAudioContextImpl {
      state = 'running';
      destination = {};
      createAnalyser = vi.fn(() => analyser);
      createMediaElementSource = vi.fn(() => source);
      resume = vi.fn();
    }
    (window as any).AudioContext = undefined;
    (window as any).webkitAudioContext = WebkitAudioContextImpl as any;
    const service = new PlayerService();
    const audio = (service as any).audio as FakeAudio;

    await service.play();
    expect(service.getWaveformData()).not.toBeNull();

    audio.currentTime = NaN;
    audio.emit('timeupdate');
    expect(service.currentTimeFormatted()).toBe('0:00');
  });

  it('manages queue navigation, shuffle, repeat, expansion, and playback rate bounds', () => {
    const service = new PlayerService();
    const second = { ...track, id: 'spec-2', title: 'Second', audioUrl: 'second.mp3' };
    const third = { ...track, id: 'spec-3', title: 'Third', audioUrl: 'third.mp3' };
    const playAtSpy = vi.spyOn(service, 'playTrackAt');

    service.showPlayer(track);
    service.showPlayer(second);
    service.showPlayer(third);

    expect(service.queue().map((item) => item.id)).toEqual(['spec-1', 'spec-2', 'spec-3']);
    expect(service.queueIndex()).toBe(2);
    expect(service.hasPrevious()).toBe(true);
    expect(service.hasNext()).toBe(true);

    service.setExpanded(true);
    expect(service.isExpanded()).toBe(true);
    service.toggleExpanded();
    expect(service.isExpanded()).toBe(false);

    service.toggleRepeat();
    expect(service.repeatEnabled()).toBe(true);
    service.toggleShuffle();
    expect(service.shuffleEnabled()).toBe(true);

    service.setPlaybackRate(3);
    expect(service.playbackRate()).toBe(2);
    service.setPlaybackRate(0.1);
    expect(service.playbackRate()).toBe(0.5);

    const originalRandom = Math.random;
    service.queueIndex.set(0);
    Math.random = vi.fn(() => 0.5);
    expect(service.playPrevious()).toBe(true);
    expect(playAtSpy).toHaveBeenCalledWith(1);

    Math.random = vi.fn(() => 0.8);
    service.queueIndex.set(0);
    expect(service.playNext()).toBe(true);
    expect(service.queueIndex()).toBe(2);
    Math.random = originalRandom;

    service.shuffleEnabled.set(false);
    service.queueIndex.set(2);
    expect(service.playNext()).toBe(true);
    expect(service.queueIndex()).toBe(0);

    service.queueIndex.set(2);
    expect(service.playNext(true)).toBe(false);
  });

  it('handles invalid queue operations, removals, clearQueue, and previous restart', () => {
    const service = new PlayerService();
    const second = { ...track, id: 'spec-2', title: 'Second', audioUrl: 'second.mp3' };

    expect(service.playTrackAt(-1)).toBe(false);
    expect(service.playPrevious()).toBe(false);
    expect(service.playNext()).toBe(false);

    service.showPlayer(track);
    service.showPlayer(second);
    service.currentTime.set(5);
    expect(service.playPrevious()).toBe(true);
    expect(service.currentTime()).toBe(0);

    service.currentTime.set(0);
    service.queueIndex.set(1);
    expect(service.playPrevious()).toBe(true);
    expect(service.queueIndex()).toBe(0);

    service.removeFromQueue(-1);
    expect(service.queue().length).toBe(2);

    service.queueIndex.set(1);
    service.removeFromQueue(0);
    expect(service.queueIndex()).toBe(0);
    expect(service.queue().map((item) => item.id)).toEqual(['spec-2']);

    service.showPlayer(track);
    service.queueIndex.set(0);
    service.removeFromQueue(0);
    expect(service.currentTrack()?.id).toBe('spec-1');

    service.clearQueue();
    expect(service.queue()).toEqual([service.currentTrack()]);

    service.hidePlayer();
    service.clearQueue();
    expect(service.queue()).toEqual([]);
  });

  it('repeats current track when audio ends with repeat enabled', async () => {
    const service = new PlayerService();
    const audio = (service as any).audio as FakeAudio;
    const playSpy = vi.spyOn(service, 'play');

    service.showPlayer(track);
    service.repeatEnabled.set(true);
    service.currentTime.set(12);
    audio.currentTime = 12;
    audio.emit('ended');

    expect(service.currentTime()).toBe(0);
    expect(playSpy).toHaveBeenCalled();
  });
});
