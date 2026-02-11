import asyncio
import os


class IngestWorker:
    def __init__(self, source_dir: str, interval: int = 8):
        self.source_dir = source_dir
        self.interval = interval
        self.file_state: dict[str, float] = {}

    async def run(self):
        while True:
            if not os.path.isdir(self.source_dir):
                await asyncio.sleep(self.interval)
                continue

            for filename in os.listdir(self.source_dir):
                if not filename.lower().endswith(".txt"):
                    continue

                path = os.path.join(self.source_dir, filename)
                try:
                    stat = os.stat(path)
                except FileNotFoundError:
                    continue

                last_mtime = self.file_state.get(path)
                if last_mtime and stat.st_mtime <= last_mtime:
                    continue

                self.file_state[path] = stat.st_mtime

            await asyncio.sleep(self.interval)
