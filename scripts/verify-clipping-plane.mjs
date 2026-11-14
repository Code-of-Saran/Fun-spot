import * as THREE from 'three';

const neckWorld = new THREE.Vector3(0, 1.5, 0);
const upWorld = new THREE.Vector3(0, 1, 0);
const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(upWorld.clone().negate(), neckWorld);

console.log('Plane normal:', plane.normal, 'constant:', plane.constant);

const headPoint = new THREE.Vector3(0, 1.8, 0);
const chestPoint = new THREE.Vector3(0, 1.2, 0);
const neckPoint = new THREE.Vector3(0, 1.5, 0);

console.log('Head point (Y=1.8) distance:', plane.distanceToPoint(headPoint), '-> should be negative (clipped):', plane.distanceToPoint(headPoint) < 0);
console.log('Chest point (Y=1.2) distance:', plane.distanceToPoint(chestPoint), '-> should be positive (visible):', plane.distanceToPoint(chestPoint) > 0);
console.log('Neck point (Y=1.5) distance:', plane.distanceToPoint(neckPoint), '-> should be 0:', plane.distanceToPoint(neckPoint) === 0);
