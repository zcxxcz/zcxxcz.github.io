"""After the Question — original instrumental score, generated from this score.
160 BPM, 4/4, 36 bars, 54 seconds. All instruments are synthesized here.
No samples, loops, pretrained music model, borrowed melody, or recorded voices.
Requires numpy, scipy. Output: unmastered stereo WAV at 48 kHz.
"""
import os
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io.wavfile import write

SR=48000
B=60/160
DURATION=54
N=int(SR*DURATION)
rng=np.random.default_rng(411302026)
mix=np.zeros((N,2),dtype=np.float64)
def hz(m): return 440*2**((m-69)/12)
def add(sig,start,amp=1,pan=0,echo=False):
    i=int(round(start*SR))
    if i<0 or i>=N:return
    count=min(len(sig),N-i)
    gl=np.cos((pan+1)*np.pi/4); gr=np.sin((pan+1)*np.pi/4)
    mix[i:i+count,0]+=sig[:count]*amp*gl
    mix[i:i+count,1]+=sig[:count]*amp*gr
    if echo:
        add(sig,start+B*.75,amp*.24,-pan)
        add(sig,start+B*1.5,amp*.10,pan)
def tone(m,d,kind='pluck'):
    t=np.arange(int(d*SR))/SR;f=hz(m)
    if kind=='pluck':
        env=(1-np.exp(-t*200))*np.exp(-t*5)
        sig=(np.sin(2*np.pi*f*t)+.36*np.sin(2*np.pi*f*2*t)*np.exp(-t*8)+.16*np.sin(2*np.pi*f*3*t)*np.exp(-t*12))*env
    elif kind=='lead':
        env=np.minimum(t/.012,1)*np.minimum((d-t)/.12,1)*np.exp(-t*.9)
        sig=(np.sin(2*np.pi*f*t+.9*np.sin(2*np.pi*f*2*t)*np.exp(-t*6))+.18*np.sin(2*np.pi*f*2.002*t))*env
    elif kind=='bass':
        env=(1-np.exp(-t*190))*np.minimum((d-t)/.055,1)*np.exp(-t*1.8)
        sig=(np.sin(2*np.pi*f*t)+.25*np.sin(2*np.pi*f*2*t)+.08*np.sin(2*np.pi*f*3*t))*env
    elif kind=='pad':
        env=np.minimum(t/.34,1)*np.minimum((d-t)/.6,1)
        sig=(np.sin(2*np.pi*f*.998*t)+np.sin(2*np.pi*f*1.002*t)+.2*np.sin(2*np.pi*f*2*t))/2.2*env
    else:
        sig=np.sin(2*np.pi*f*t)*np.exp(-t*8)*(1-np.exp(-t*300))
    return sig
def kick(at,amp=1):
    t=np.arange(int(.35*SR))/SR
    phase=2*np.pi*(46*t+75*.026*(1-np.exp(-t/.026)))
    sig=np.sin(phase)*np.exp(-t*13)+rng.normal(0,.08,len(t))*np.exp(-t*140)
    add(sig,at,.63*amp)
def snare(at,amp=1):
    t=np.arange(int(.24*SR))/SR
    noise=rng.normal(0,1,len(t));noise=sosfilt(butter(2,1400,fs=SR,btype='highpass',output='sos'),noise)
    sig=noise*np.exp(-t*23)*.42+np.sin(2*np.pi*186*t)*np.exp(-t*30)*.28
    add(sig,at,.31*amp,.1)
def hat(at,amp=1,open_=False):
    d=.19 if open_ else .055;t=np.arange(int(d*SR))/SR
    sig=sosfilt(butter(2,8200,fs=SR,btype='highpass',output='sos'),rng.normal(0,1,len(t)))
    sig*=np.exp(-t*(24 if open_ else 80))
    add(sig,at,.09*amp,(-.45 if int(at/B*2)%2 else .45))
def impact(at,amp=.4):
    t=np.arange(int(1.1*SR))/SR
    sig=np.sin(2*np.pi*(42*t+42*.045*(1-np.exp(-t/.045))))*np.exp(-t*7)
    sig+=sosfilt(butter(1,3000,fs=SR,output='sos'),rng.normal(0,.09,len(t)))*np.exp(-t*5)
    add(sig,at,amp)
def riser(at,d,amp=.1):
    t=np.arange(int(d*SR))/SR;p=t/d
    noise=sosfilt(butter(2,[1200,9500],fs=SR,btype='bandpass',output='sos'),rng.normal(0,1,len(t)))
    sig=noise*(p**2)*.7+np.sin(2*np.pi*(180*t+650/d*t*t))*p**3*.1
    add(sig,at,amp,0)

# Dm(add9), Bbmaj7, F(add9), C(sus2): an original brightening harmonic arc.
chords=[[50,57,62,65,69,76],[46,53,58,62,65,69],[48,55,60,65,69,74],[48,55,60,62,67,72]]
roots=[38,34,41,36]
for bar in range(36):
    start=bar*4*B
    chord=chords[(bar//2)%4]
    intensity= .45 if bar<2 else .7 if bar<8 else 1 if bar<28 else .95 if bar<32 else .5
    if 12<=bar<14:intensity=.5
    if bar>=34:intensity=.15
    # Wide sustained harmony. The final two bars resolve on Fmaj9.
    if bar%2==0:
        voice=chord if bar<34 else [53,60,65,69,72,79]
        for j,m in enumerate(voice):add(tone(m,3.0,'pad'),start,.037,pan=-.75+j*.3)
    # Bass syncopation and motion, increasing in the middle of the film.
    if bar<34:
        for pos in [0,1.5,2.5,3.25]:
            add(tone(roots[(bar//2)%4]+(12 if pos==3.25 else 0),.28,'bass'),start+pos*B,.21*intensity)
    # Sixteenth-note arpeggio with changing inversions and stereo placement.
    if bar>=2 and bar<34:
        pat=[0,2,4,3,1,4,2,5]
        for step in range(8):
            m=chord[pat[(step+bar%3)%8]]+12
            add(tone(m,.6),start+step*.5*B,.058*intensity,pan=np.sin(step*1.7+bar)*.65,echo=True)
    elif bar<2:
        for step in [0,2,3]:add(tone(chord[step+1]+12,.8),start+step*B,.065,pan=step/3-.5,echo=True)
    # Tight electronic drums, with two quieter breathing sections.
    if bar>=2 and bar<34:
        kicks=[0,2] if bar<8 or 12<=bar<14 or bar>=32 else [0,1.5,2,2.75]
        for pos in kicks:kick(start+pos*B,intensity)
        for pos in [1,3]:snare(start+pos*B,intensity)
        for step in range(8):hat(start+step*.5*B,intensity*(.75 if step%2 else .4),step==7 and bar%2==1)
        if bar%4==3 and bar<32:
            for step in [6.5,7,7.5]:snare(start+step*.5*B,.28*intensity)
    # A newly composed melodic phrase; no externally supplied tune.
    melody=[(0,74),(.75,77),(1.5,81),(2.5,79),(3.25,77)]
    if 8<=bar<12 or 16<=bar<24 or 28<=bar<32:
        shifts=[0,-2,0,-2]
        for pos,m in melody:
            add(tone(m+shifts[bar%4],.48,'lead'),start+pos*B,.065,pan=.12,echo=True)
    # Every scene begins on an eight-beat boundary, exactly 3 seconds.
    if bar%2==0 and bar<34:impact(start,.23 if bar<8 else .33)
for at in [5.25,11.25,17.25,23.25,29.25,35.25,41.25,47.25]:riser(at,.75,.1)
for at in [0,3,6,9,12,15,18,21,24,27,30,33,36,39,42,45,48,51]:
    add(tone(86 if at<30 else 89,.65,'bell'),at,.058,pan=-.3,echo=True)
# Closing cadence, enough time to hear the final title.
for j,m in enumerate([65,69,72,77,81]):add(tone(m,2.8,'lead'),51+j*.065,.09,pan=(j-2)*.3,echo=True)
impact(51,.42)

# Gentle sidechain movement matched to the motion pulse, then a musical fade.
times=np.arange(N)/SR
duck=1-.17*np.exp(-np.mod(times,B)*24)
mix*=duck[:,None]
mix*=np.minimum(times/.05,1)[:,None]
mix*=np.minimum((DURATION-times)/1.15,1)[:,None]
mix=np.tanh(mix*1.05)
mix*=.88/max(np.max(np.abs(mix)),1e-9)
dest=Path(os.environ.get('TRIBUTE_OUTPUT',Path(__file__).resolve().parent.parent))
dest.mkdir(parents=True,exist_ok=True)
write(dest/'score-raw.wav',SR,(mix*32767).astype(np.int16))
print(f'Original score: {dest}/score-raw.wav; {DURATION}s, {SR}Hz, 160 BPM')
