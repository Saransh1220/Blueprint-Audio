import { computed, Injectable, signal } from '@angular/core';
import type { Spec } from '../models';

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  private audio = new Audio();
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private previousVolume = 1;

  public dataArray: Uint8Array | null = null;

  public isVisible = signal(false);
  public isExpanded = signal(false);
  public isPlaying = signal(false);
  public currentTrack = signal<Spec | null>(null);
  public duration = signal(0);
  public currentTime = signal(0);
  public volume = signal(1);
  public queue = signal<Spec[]>([]);
  public queueIndex = signal(0);
  public shuffleEnabled = signal(false);
  public repeatEnabled = signal(false);
  public playbackRate = signal(1);

  public currentTimeFormatted = computed(() => this.formatTime(this.currentTime()));
  public durationFormatted = computed(() => this.formatTime(this.duration()));
  public volumeIcon = computed(() => {
    const vol = this.volume();
    if (vol === 0) return 'fa-volume-xmark';
    if (vol < 0.5) return 'fa-volume-low';
    return 'fa-volume-high';
  });
  public hasPrevious = computed(() => this.queue().length > 1 || this.currentTime() > 3);
  public hasNext = computed(() => this.queue().length > 1);

  constructor() {
    this.audio.crossOrigin = 'anonymous';
    this.audio.volume = this.volume();
    this.audio.playbackRate = this.playbackRate();

    this.audio.addEventListener('loadedmetadata', () => {
      this.duration.set(this.audio.duration || 0);
    });

    this.audio.addEventListener('timeupdate', () => {
      this.currentTime.set(this.audio.currentTime || 0);
    });

    this.audio.addEventListener('ended', () => {
      if (this.repeatEnabled()) {
        this.seekTo(0);
        void this.play();
        return;
      }

      const didAdvance = this.playNext(true);
      if (!didAdvance) {
        this.isPlaying.set(false);
        this.currentTime.set(0);
      }
    });
  }

  private initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;

      this.source = this.audioContext.createMediaElementSource(this.audio);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
    }

    if (this.audioContext.state === 'suspended') {
      void this.audioContext.resume();
    }
  }

  getWaveformData(): Uint8Array | null {
    if (this.analyser && this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray as any);
      return this.dataArray;
    }
    return null;
  }

  showPlayer(track: Spec) {
    const queue = this.queue();
    const existingIndex = queue.findIndex((item) => item.id === track.id);
    const nextQueue = existingIndex >= 0 ? queue : [...queue, track];
    const nextIndex = existingIndex >= 0 ? existingIndex : nextQueue.length - 1;

    this.queue.set(nextQueue);
    this.queueIndex.set(nextIndex);
    this.loadTrack(nextQueue[nextIndex]);
  }

  hidePlayer() {
    this.pause();
    this.isVisible.set(false);
    this.isExpanded.set(false);
    this.currentTrack.set(null);
    this.queue.set([]);
    this.queueIndex.set(0);
    this.currentTime.set(0);
    this.duration.set(0);
  }

  toggleExpanded() {
    this.isExpanded.update((expanded) => !expanded);
  }

  setExpanded(expanded: boolean) {
    this.isExpanded.set(expanded);
  }

  toggleShuffle() {
    this.shuffleEnabled.update((enabled) => !enabled);
  }

  toggleRepeat() {
    this.repeatEnabled.update((enabled) => !enabled);
  }

  setPlaybackRate(rate: number) {
    const clamped = Math.max(0.5, Math.min(2, rate));
    this.audio.playbackRate = clamped;
    this.playbackRate.set(clamped);
  }

  togglePlay() {
    if (this.audio.paused) {
      void this.play();
    } else {
      this.pause();
    }
  }

  play() {
    this.initAudioContext();
    return this.audio
      .play()
      .then(() => {
        this.isPlaying.set(true);
      })
      .catch((err) => console.error('Playback error:', err));
  }

  pause() {
    this.audio.pause();
    this.isPlaying.set(false);
  }

  seekTo(time: number) {
    this.audio.currentTime = time;
    this.currentTime.set(time);
  }

  setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.audio.volume = clamped;
    this.volume.set(clamped);
  }

  toggleMute() {
    if (this.volume() > 0) {
      this.previousVolume = this.volume();
      this.setVolume(0);
    } else {
      this.setVolume(this.previousVolume > 0 ? this.previousVolume : 1);
    }
  }

  playTrackAt(index: number) {
    const queue = this.queue();
    if (index < 0 || index >= queue.length) return false;

    this.queueIndex.set(index);
    this.loadTrack(queue[index]);
    return true;
  }

  playPrevious() {
    if (this.currentTime() > 3) {
      this.seekTo(0);
      return true;
    }

    const queue = this.queue();
    if (!queue.length) return false;

    const currentIndex = this.queueIndex();
    if (currentIndex > 0) {
      return this.playTrackAt(currentIndex - 1);
    }

    if (queue.length > 1 && this.shuffleEnabled()) {
      return this.playRandomTrack(currentIndex);
    }

    this.seekTo(0);
    return true;
  }

  playNext(autoAdvance: boolean = false) {
    const queue = this.queue();
    if (!queue.length) return false;

    const currentIndex = this.queueIndex();

    if (this.shuffleEnabled() && queue.length > 1) {
      return this.playRandomTrack(currentIndex);
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < queue.length) {
      return this.playTrackAt(nextIndex);
    }

    if (!autoAdvance && currentIndex > -1) {
      return this.playTrackAt(0);
    }

    return false;
  }

  removeFromQueue(index: number) {
    const queue = this.queue();
    if (index < 0 || index >= queue.length) return;

    const nextQueue = queue.filter((_, currentIndex) => currentIndex !== index);
    const currentIndex = this.queueIndex();

    if (!nextQueue.length) {
      this.hidePlayer();
      return;
    }

    if (index === currentIndex) {
      const nextIndex = Math.min(index, nextQueue.length - 1);
      this.queue.set(nextQueue);
      this.queueIndex.set(nextIndex);
      this.loadTrack(nextQueue[nextIndex]);
      return;
    }

    this.queue.set(nextQueue);
    if (index < currentIndex) {
      this.queueIndex.set(currentIndex - 1);
    }
  }

  clearQueue() {
    const current = this.currentTrack();
    if (!current) {
      this.hidePlayer();
      return;
    }

    this.queue.set([current]);
    this.queueIndex.set(0);
  }

  private playRandomTrack(currentIndex: number) {
    const queue = this.queue();
    if (queue.length <= 1) return false;

    let nextIndex = currentIndex;
    while (nextIndex === currentIndex) {
      nextIndex = Math.floor(Math.random() * queue.length);
    }
    return this.playTrackAt(nextIndex);
  }

  private loadTrack(track: Spec) {
    this.currentTrack.set(track);
    this.isVisible.set(true);
    this.currentTime.set(0);
    this.duration.set(track.duration ?? 0);

    if (track.audioUrl) {
      this.audio.src = track.audioUrl;
      void this.play();
    } else {
      console.warn('No audio URL found for track', track.title);
      this.pause();
    }
  }

  private formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}
