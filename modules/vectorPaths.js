import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import * as THREE from 'https://unpkg.com/three@v0.149.0/build/three.module.js';

const loadVectorPaths = async (file) => {

  const svgText = await fetch(file).then(res => res.text());
  const svgDoc = (new DOMParser()).parseFromString(svgText, "image/svg+xml");
  const svg = d3.select(svgDoc.documentElement).remove();
  const [,, width, height] = svg.attr('viewBox').split(' ');

  // extract d attr of path elements
  // parse into a collection of waypoints
  const paths = svg.selectAll('path').nodes()
    .map(node => d3.select(node).attr('d'))
    .map(path => {
      const [, starting, curveCommands] = path.match(/M([\d.-]+,[\d.-]+)(.*)/);
      const startingPoint = starting.split(',').map(parseFloat);

      // extract bezier end points from each segment
      const segments = curveCommands.split(/[a-zA-Z]/).filter(str => str.trim() !== '');
      const coordinates = segments.map(segment => {
        const [,,,,x,y] = segment.match(/-?\d+(\.\d+)?/g); // six digits, corresponding to controlP0, controlP1, and end point; we only need the end point
        return [x,y].map(parseFloat);
      })
      .slice(0, -2);

      // coordinates are relative to starting point
      // coordinates also need to normalized to [0, 1]
      let currentPos = [...startingPoint];
      coordinates.forEach(xy => {
        xy[0] += currentPos[0];
        xy[1] += currentPos[1];
        currentPos = [...xy];

        // normalize by svg viewBox dimensions
        xy[0] /= width;
        xy[1] /= height;
      });

      // TODO add startingPoint back in
     
      return coordinates;
    });
  
  return paths;
}

const resizeVectorPaths = (width, height) => {

	const resizeCoordinates = coordinates => {

	  // resize normalized cooridnates to width and height
	  const c = coordinates.map(([x, y]) => [x*width, y*height]);

      // convert c -> THREE.js spline
      const curve = new THREE.SplineCurve(
        c.map(xy => new THREE.Vector2(...xy))
      );
      const curvePoints = curve.getPoints(50).map(p => [p.x, p.y]);

      return {
      	curve, 
      	curveLength:curve.getLength(), 
      	curvePoints, 
      }

	}

	return resizeCoordinates;
}

export { loadVectorPaths, resizeVectorPaths };