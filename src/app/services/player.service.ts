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

  // Data buffer
  public dataArray: Uint8Array | null = null;

  // State signals
  public isVisible = signal(false);
  public isPlaying = signal(false);
  public currentTrack = signal<Spec | null>(null);
  public duration = signal(0);
  public currentTime = signal(0);
  public volume = signal(1); // 0 to 1

  // Computed display values
  public currentTimeFormatted = computed(() => this.formatTime(this.currentTime()));
  public durationFormatted = computed(() => this.formatTime(this.duration()));
  public volumeIcon = computed(() => {
    const vol = this.volume();
    if (vol === 0) return 'fa-volume-xmark';
    if (vol < 0.5) return 'fa-volume-low';
    return 'fa-volume-high';
  });

  constructor() {
    this.audio.crossOrigin = 'anonymous';
    this.audio.volume = this.volume();

    this.audio.addEventListener('loadedmetadata', () => {
      this.duration.set(this.audio.duration);
    });

    this.audio.addEventListener('timeupdate', () => {
      this.currentTime.set(this.audio.currentTime);
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying.set(false);
      this.currentTime.set(0);
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
      this.audioContext.resume();
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
    this.currentTrack.set(track);
    this.isVisible.set(true);

    if (track.audioUrl) {
      this.audio.src = track.audioUrl;
      this.play();
    } else {
      console.warn('No audio URL found for track', track.title);
    }
  }

  hidePlayer() {
    this.pause();
    this.isVisible.set(false);
    this.currentTrack.set(null);
  }

  togglePlay() {
    if (this.audio.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  play() {
    this.initAudioContext();
    this.audio
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
  }

  setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.audio.volume = clamped;
    this.volume.set(clamped);
  }

  private formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}
