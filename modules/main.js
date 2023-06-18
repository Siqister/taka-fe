import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import * as THREE from 'https://unpkg.com/three@v0.149.0/build/three.module.js';
import { loadVectorPaths, resizeVectorPaths } from './vectorPaths.js';

const CIRCLE_SIZE = 2;
const SPEED_RATIO = 200;
const API_POLLING_INTERVAL = 3000;
let pathsToDraw = [];

window.addEventListener("load", async () => {

	// get canvas dimensions
	let width = d3.select('.vis').node().offsetWidth;
	let height = d3.select('.vis').node().offsetHeight;

	// load svg vector paths
	const normalizedCoordinates = await loadVectorPaths('../assets/Floater_Vector-Master_paths@1.svg');
	let paths = normalizedCoordinates.map(resizeVectorPaths(width, height));
	
	// set up canvas
	const canvas = d3.select('.vis').append('canvas')
		.attr('width', width)
		.attr('height', height)
		.style('filter', 'blur(1px)')
		.node();
	const ctx = canvas.getContext('2d');

	const offScreenCanvas = d3.create('canvas')
		.attr('width', width)
		.attr('height', height)
		.node();
	const offScreenCtx = offScreenCanvas.getContext('2d');

	// draw canvas frame
	const draw = () => {
		const t = new Date();

		ctx.clearRect(0, 0, width, height);
		ctx.save();
		ctx.globalAlpha = .99;
		ctx.drawImage(offScreenCanvas, 0, 0);
		ctx.restore();

		// calculate position of moving dots
		pathsToDraw = pathsToDraw.map(p => {
			const {curve, curveLength, t0, speed} = p;
			const elapsedTime = t.valueOf() - t0.valueOf();
			const dist = speed / SPEED_RATIO * elapsedTime;
			const pct = dist/curveLength;
			p.pct = pct;
			return p;
		}).filter(p => p.pct < 1);

		// render path and points
		pathsToDraw.forEach(({ curve, curvePoints, pct, offset }) => {
			const point = curve.getPointAt(pct);
			const opacity = Math.sin(pct * Math.PI);

			const size = (0.7 + 0.3 * Math.sin(pct * Math.PI)) * (0.85 + 0.15 * (Math.sin((pct + offset) * Math.PI * 3) + 1));
			if(point.x && point.y){
				ctx.beginPath();
				ctx.fillStyle = `rgba(225, 225, 225, ${opacity})`;
				ctx.arc(point.x, point.y, CIRCLE_SIZE*size, 0, Math.PI*2);
				ctx.fill();
			}
		});

		// copy snap to off screen canvas
		offScreenCtx.clearRect(0, 0, width, height);
		offScreenCtx.drawImage(canvas, 0, 0);
	}

	// API fetching
	const onApiFetchSuccess = ({ pm25, pm10 }) => {
	    // pick two random paths from paths data
	    // TODO: pick two non-overlapping paths
	    const path1 = paths[Math.floor(paths.length * Math.random())];
	    const path2 = paths[Math.floor(paths.length * Math.random())];
	    const t0 = new Date();

	    path1.t0 = t0;
	    path2.t0 = t0;
	    path1.speed = +pm25;
	    path2.speed = +pm10;
	    path1.offset = Math.random();
	    path2.offset = Math.random();

	    pathsToDraw.push(path1);
	    pathsToDraw.push(path2);
	}

	// update loop
	// perform periodic API polling
	// update animation frame
	let lastUpdateTime = 0;

	const update = () => {

		// draw frame
		draw();

		// fetch data every POLLING_INTERVAL seconds
		const currentTime = (new Date()).valueOf();
		if((currentTime - lastUpdateTime) >= API_POLLING_INTERVAL){
		  	// poll API for fresh data
		  	fetch("https://taka-robot-api.herokuapp.com/sensor")
		    	.then(res => {
			      	if(!res.ok){
			        	throw new Error("API didn't return data");
			      	}
			      	return res.json();
		    	})
		    	.then(onApiFetchSuccess)
		    	.catch(err => console.log(err));
		  
		  	lastUpdateTime = currentTime;
		}
		requestAnimationFrame(update);

	}

	// handle resize
	window.onresize = e => {
		width = d3.select('.vis').node().offsetWidth;
		height = d3.select('.vis').node().offsetHeight;

		paths = normalizedCoordinates.map(resizeVectorPaths(width, height));
	}

	update();

});