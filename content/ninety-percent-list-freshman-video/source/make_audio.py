"""Generate public lesson narration and sentence timings. Requires edge-tts and ffprobe."""
import asyncio,json,pathlib,subprocess,sys
import edge_tts
ROOT=pathlib.Path(__file__).resolve().parents[1]
WORK=pathlib.Path(sys.argv[1])
WORK.mkdir(parents=True,exist_ok=True)
data=json.loads((ROOT/'lesson.json').read_text())
sem=asyncio.Semaphore(2)
async def make(i,s):
    async with sem:
        out=WORK/f'{i:02}.mp3';meta=WORK/f'{i:02}.json'
        if out.exists() and meta.exists():return
        text='\n'.join(s['narration'])
        for attempt in range(3):
            events=[]
            try:
                comm=edge_tts.Communicate(text,data['voice'],rate='+5%',boundary='SentenceBoundary')
                with out.open('wb') as f:
                    async for event in comm.stream():
                        if event['type']=='audio':f.write(event['data'])
                        elif event['type']=='SentenceBoundary':events.append(event)
                duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(out)]))
                if not events or duration<1:raise RuntimeError('Missing audio or sentence timing')
                meta.write_text(json.dumps(dict(duration=duration,events=events),ensure_ascii=False,indent=2))
                print(i,s['title'],round(duration,2),flush=True)
                return
            except Exception:
                if attempt==2:raise
                await asyncio.sleep(2)
async def main():await asyncio.gather(*(make(i,s) for i,s in enumerate(data['scenes'])))
asyncio.run(main())
