import { execFile } from 'child_process';
import { getConfig } from '../config/store';
import { logger } from '../logging/logger';

/**
 * Ethical TTS notification system.
 * Uses Windows SAPI (System.Speech) via PowerShell to announce recording state.
 * Temporarily ensures system volume is audible even if muted — this is intentional
 * for ethical transparency: all meeting participants must know a recording is active.
 */

const PS_SPEAK_WITH_VOLUME = (text: string, volume: number = 60) => `
Add-Type -AssemblyName System.Speech
# Ensure audio endpoint is not muted and volume is at least ${volume}%
try {
  Add-Type -TypeDefinition @"
    using System.Runtime.InteropServices;
    [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IAudioEndpointVolume {
      int _0(); int _1(); int _2(); int _3();
      int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext);
      int _5();
      int GetMasterVolumeLevelScalar(out float pfLevel);
      int _7();
      int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, System.Guid pguidEventContext);
      int GetMute(out bool pbMute);
    }
    [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDevice { int Activate(ref System.Guid iid, int dwClsCtx, System.IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface); }
    [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDeviceEnumerator { int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice); }
    [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorComObject { }
    public class VolumeControl {
      public static float savedVolume = -1;
      public static bool savedMute = false;
      public static void EnsureAudible(float minLevel) {
        var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
        IMMDevice device;
        enumerator.GetDefaultAudioEndpoint(0, 1, out device);
        var iid = typeof(IAudioEndpointVolume).GUID;
        object o;
        device.Activate(ref iid, 1, System.IntPtr.Zero, out o);
        var vol = (IAudioEndpointVolume)o;
        bool muted; vol.GetMute(out muted); savedMute = muted;
        float level; vol.GetMasterVolumeLevelScalar(out level); savedVolume = level;
        if (muted) vol.SetMute(false, System.Guid.Empty);
        if (level < minLevel) vol.SetMasterVolumeLevelScalar(minLevel, System.Guid.Empty);
      }
      public static void Restore() {
        if (savedVolume < 0) return;
        var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
        IMMDevice device;
        enumerator.GetDefaultAudioEndpoint(0, 1, out device);
        var iid = typeof(IAudioEndpointVolume).GUID;
        object o;
        device.Activate(ref iid, 1, System.IntPtr.Zero, out o);
        var vol = (IAudioEndpointVolume)o;
        vol.SetMasterVolumeLevelScalar(savedVolume, System.Guid.Empty);
        if (savedMute) vol.SetMute(true, System.Guid.Empty);
      }
    }
"@ -ErrorAction Stop
  [VolumeControl]::EnsureAudible(${volume / 100})
} catch { }
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = 1
$synth.Volume = 100
$synth.Speak("${text}")
try { [VolumeControl]::Restore() } catch { }
`;

function runPowerShell(script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ps = execFile('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-Command', script,
    ], { timeout: 15000 }, (err) => {
      if (err) {
        logger.warn('TTS notification failed', { error: err.message });
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export async function speakNotification(text: string): Promise<void> {
  const config = getConfig();
  if (!config.ethicalNotifications) return;

  logger.info('TTS notification', { text });
  try {
    await runPowerShell(PS_SPEAK_WITH_VOLUME(text, 60));
  } catch {
    // Fallback: try without volume control
    try {
      const fallback = `
        Add-Type -AssemblyName System.Speech
        $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
        $synth.Volume = 100
        $synth.Speak("${text}")
      `;
      await runPowerShell(fallback);
    } catch (e) {
      logger.error('TTS fallback also failed', { error: (e as Error).message });
    }
  }
}

export function announceRecordingStarted(): Promise<void> {
  return speakNotification('Rekal recording has started. This meeting is being recorded.');
}

export function announceRecordingStopped(): Promise<void> {
  return speakNotification('Rekal recording has stopped.');
}

export function announceRecordingInProgress(): Promise<void> {
  return speakNotification('Recording in progress.');
}
