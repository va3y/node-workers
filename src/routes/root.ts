import { FastifyPluginAsync } from "fastify";
import { Worker } from "worker_threads";

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.get("/", async function (_req, res) {
		res.status(200).send("This page is non-blocking");
	});

	fastify.get("/blocking", (_req, res) => {
		let counter = 0;
		for (let i = 0; i < 20_000_000_000; i++) {
			counter++;
		}

		res.status(201).send(counter);
	});

	// responseTime: 18193.548792004585
	fastify.get("/worker", (_req, res) => {
		const worker = new Worker("./src/worker.mjs");

		worker.on("message", (data) => {
			res.status(200).send(`result is ${data}`);
		});
		worker.on("error", (msg) => {
			res.status(404).send(`An error occurred: ${msg}`);
		});
	});

	// 4 THREADS: responseTime: 4239.4973750039935
	// 8 THREADS: responseTime: 2249.992208994925
	// 10 THREADS: responseTime: 2125.6044589951634
	// 100 THREADS: responseTime: 2554.757500000298
	// 1000 THREADS: responseTime: 14591.27350000292
	fastify.get("/multi-core-worker", async (_req, res) => {
		const THREADS = 10;

		function createWorker() {
			return new Promise<number>((resolve, reject) => {
				const worker = new Worker("./src/multiCoreWorker.mjs", {
					workerData: { threadCount: THREADS },
				});

				worker.on("message", (data) => {
					resolve(data);
				});
				worker.on("error", (msg) => {
					reject(msg);
				});
			});
		}

		const workersResult = await Promise.all(
			Array(THREADS)
				.fill(null)
				.map(() => createWorker())
		);

		res.send(`total: ${workersResult.reduce((acc, curr) => acc + curr, 0)}`);
	});
};

export default root;
