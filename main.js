import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js'; 

import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/controls/OrbitControls.js'; 
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124/examples/jsm/loaders/GLTFLoader.js'; 

//import {loadGLTF} from './blenderImport.js'

// Declare renderer, camera and create scene
const renderer = new THREE.WebGLRenderer()
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.3, 10000) // FOV, window ratio, near, far
const scene = new THREE.Scene()
const controls = new OrbitControls(camera, renderer.domElement) // create orbit controls
let poolTable
let poolCue
let billiardRoom
let ballTable

// Billiard ball properties
const radius = 0.0525
const m = 0.220
const g = 9.82
const my = 0.55
const theta = 0.02
const motionOfInertia = 5 / 7

// Billiard table inner size
const width = 2.24 * 2
const height = 1.12 * 2

const h = 1 / 60

// User player variables
const maxPower = 200
const minPower = 0
const forceChange = 10
const angleChange = Math.PI / 180

// Texture
const texLoader = new THREE.TextureLoader()

const size = 0.5
const geometryPosters = new THREE.PlaneGeometry(3 * size, 4 * size) // 4:3 aspect ratio for pics
const posterMaterials = Array.from({ length: 8 }, () => (new THREE.MeshStandardMaterial({})))
const posters = []

let posterCounter = 0

// Create meshes for posters as planes
for (let i = 0; i < posterMaterials.length; ++i) {
  posterMaterials[i].map = texLoader.load('textures/poster' + i + '.jpg') // jpeg

  posters.push(new THREE.Mesh(geometryPosters, posterMaterials[i]))
  posters[i].castShadow = true
  posters[i].receiveShadow = true
  scene.add(posters[i])
}

// Position posters, 4 on each side
for (let i = 0; i < posterMaterials.length / 2; ++i) {
  posters[i].position.set(posterCounter - 2, 1.5, -4.1)
  posterCounter += 3
}

let posterConuter2 = 0

for (let i = posterMaterials.length / 2; i < posterMaterials.length; ++i) {
  posters[i].rotation.y = Math.PI
  posters[i].position.set(posterConuter2 - 2, 1.5, 6.05)
  posterConuter2 += 3
}

// Create sphere and its properties
const geometryBall = new THREE.SphereGeometry(radius, 42, 42) // Radius, width Segments, height Segments
const materials = Array.from({ length: 16 }, () => (new THREE.MeshStandardMaterial({}))) // Create array with material compability for balls

// create empty array for balls
const spheres = []

// Initialize each ball and add texture to it and add it to the scene
// Let shadows cast and fall from/on balls
for (let i = 0; i < materials.length; ++i) {
  materials[i].map = texLoader.load('textures/' + i + '.jpg') // Set texture from file, file must be named as the number of the ball, white ball is 0

  spheres.push(new THREE.Mesh(geometryBall, materials[i]))
  spheres[i].castShadow = true
  spheres[i].receiveShadow = true
  spheres[i].rotation.set(2 * Math.PI * Math.random(), 2 * Math.PI * Math.random(), 2 * Math.PI * Math.random())
  scene.add(spheres[i])
}

// Since shadows don't want to work on the table a plane is created in level with the table
// to make shadows fall on it. If solution of real shadows is found, remove this!
// The plane is invisible except where shadows are created, ShadowMaterial
const planeGeometry = new THREE.PlaneGeometry(width + 4 * radius, height + 4 * radius, 32, 32)
const planeMaterial = new THREE.ShadowMaterial({})
const shadowPlane = new THREE.Mesh(planeGeometry, planeMaterial)
shadowPlane.receiveShadow = true
shadowPlane.rotation.x = -Math.PI / 2
shadowPlane.position.set(width / 2, -0.05, height / 2)
scene.add(shadowPlane)

// Work around to make table cast shadows, same reason as above
const length = height, width2 = width

const shape = new THREE.Shape()
shape.moveTo(0, 0)
shape.lineTo(0, width2)
shape.lineTo(length, width2)
shape.lineTo(length, 0)
shape.lineTo(0, 0)

const extrudeSettings = {
  steps: 2,
  depth: length,
  bevelEnabled: true,
  bevelThickness: 0.3,
  bevelSize: 0.5,
  bevelOffset: 0,
  bevelSegments: 10
}

const tableBlockGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings) //new THREE.BoxGeometry(width*1.1, 0.3, height*1.1)
const tableBlockMaterial = new THREE.ShadowMaterial({})
const tableBlock = new THREE.Mesh(tableBlockGeometry, tableBlockMaterial)
tableBlock.castShadow = true
tableBlock.rotation.z = -Math.PI / 2
tableBlock.scale.set(0.1, 0.9, 0.91)
tableBlock.position.set(0.25, -0.2, 0.06)
scene.add(tableBlock)

const floorShadowGeometry = new THREE.PlaneGeometry(8, 4, 1)
const floorShadowMaterial = new THREE.ShadowMaterial({})
floorShadowMaterial.opacity = 0.4
floorShadowMaterial.transparent = true
const floorShadow = new THREE.Mesh(floorShadowGeometry, floorShadowMaterial)
floorShadow.rotation.x = -Math.PI / 2
floorShadow.receiveShadow = true
floorShadow.position.set(width / 2, -1.6, height / 2)
scene.add(floorShadow)

// Velocity and position vectors of the first ball
const v = new Array(spheres.length).fill(new THREE.Vector2(0, 0))
const p = [new THREE.Vector2(width / 6, height / 2)]

// Create the standard billiard setup
const row = 5
const space = 2.2
let nrow = 0
for (let n = 1; n <= row; ++n) {
  ++nrow
  for (let m = 1; m <= nrow; ++m) {
    p.push(new THREE.Vector2(2 / 3 * width + (nrow) * radius * space, height / 2 + space / 2 * (nrow - 1) * radius - space * radius * (m - 1)))
  }
}

const standPosition = [...p]

// Each ball's friction
const Friction = new Array(spheres.length).fill(0)
Friction[0] = m * g * my

// Declaration of first velocity balls get and the position of the previous iteration
const initialVelocity = new Array(spheres.length).fill(0)
const prevPosition = new Array(spheres.length).fill(0)

// Create the array with ball angles
const tau = new Array(spheres.length).fill(0)
tau[0] = -Math.PI / 180 * (0)

// Initial Force on the first ball, move? Later in the UI
let Force = 200 * 0
let Force_temp = 100
let firstBall = true

// Load billiard table from blender file
function loadGLTF() {
  const tableLoader = new GLTFLoader()
  // Load table
  tableLoader.load('./assets/pooltable.gltf', (gltf) => {
      poolTable = gltf.scene
      scene.add(poolTable)
      poolTable.castShadow = true
      poolTable.receiveShadow = true
      poolTable.position.set(0.01   , -radius, width / 2) // Position the table correctly and rotate
  })

  // Load cue
  const cueLoader = new GLTFLoader()
  cueLoader.load('./assets/poolcue.gltf', (gltf) => {
      poolCue = gltf.scene
      scene.add(poolCue)
      poolCue.castShadow = true
      poolCue.receiveShadow = true
      poolCue.position.set(0, 0, 0) // Position pool cue
      poolCue.rotation.set(0, 0, 0.2) // Rotate pool cue to look good
  })
  
  // Load room
  const roomLoader = new GLTFLoader()
  roomLoader.load('./assets/biljardRoom.gltf', (gltf) => {
      billiardRoom = gltf.scene
      scene.add(billiardRoom)
      billiardRoom.castShadow = true
      billiardRoom.receiveShadow = true
      billiardRoom.position.set(2, -0.25, 1)
  })

}

// Load the billiard table
loadGLTF()

function euler(inV, inP, n) {
  // Calculate acceleration accordint to ODE v' = (F-F_friction)/m
  const a = new THREE.Vector2((Force - Friction[n]) * Math.cos(tau[n]) / m, (Force - Friction[n]) * Math.sin(tau[n]) / m)

  // Iterate next velocity according to Euler's method
  const outV = new THREE.Vector2()
  outV.x = inV.x + a.x * h
  outV.y = inV.y + a.y * h

  // Iterate next position according to Euler's method
  const outP = new THREE.Vector2()
  outP.x = inP.x + outV.x * h
  outP.y = inP.y + outV.y * h

  // Test if ball should stop, then remove friction and set velocity to 0
  if (outV.x * Math.cos(tau[n]) < 0) {
      Friction[n] = 0
      outV.x = 0
      outV.y = 0
  }

  if (inV.length() == 0) {
      initialVelocity[n] = outV.length()
  }

  Force = 0 // Only force pushing the ball in the first frame, @TODO find a better solution?
  return [outV, outP]
}

let counter = 0 // Counter to place the balls
let rowCounter = 0

// Detect if the ball is colliding with a wall or goes into a hole
// Then it mirrors the velocity in that axis, or teleport the ball to the side
// @param inP is the current position, prevPos is the position from last iteration, inV is the current velocity, n is the slot in the spheres array
// @return outV is the velocity after edge collision, or the same, outP is the position after edge collision
function edgeDetection(inP, prevPos, inV, n) {
    // Non elastic collision
    const elast = 0.5
    let out

    // Declare out variables
    let outV = new THREE.Vector2()
    let outP = new THREE.Vector2()

    // Test if ball goes in hole, then teleport en remove velocity
    if (inP.distanceTo(new THREE.Vector2(0, -2 * radius)) <= 2.9 * radius || (inP.distanceTo(new THREE.Vector2(width + 2 * radius, -2 * radius)) <= 2.9 * radius ||
        (inP.distanceTo(new THREE.Vector2(width + 2 * radius, height)) <= 2.9 * radius)) || (inP.distanceTo(new THREE.Vector2(0, height)) <= 2.9 * radius) ||
        (inP.distanceTo(new THREE.Vector2(width / 2 + radius, -2 * radius)) <= 3.5 * radius / 2) || (inP.distanceTo(new THREE.Vector2(width / 2 + radius, height)) <= 3.5 * radius / 2)) {
        if (n == 0) {
            // If white ball goes in, do something different
            outP = new THREE.Vector2(width / 6, height / 2)
            out = new THREE.Vector2(0, 0)
            Friction[n] = 0
        }
        else {
            // Regular ball goes into hole
            outP = new THREE.Vector2(5 + rowCounter, counter + 0.5)
            out = new THREE.Vector2(0, 0)
            Friction[n] = 0
            counter += 2.5 * radius
            spheres[n].rotation.set(0, 0, 1 * Math.PI / 3)

            if (counter / (2.5 * radius) > 8) {
                rowCounter = 2.5 * radius
                counter = 0
            }


        }
    }
    // Ball collides with top or bottom
    else if ((inP.y >= height - radius || inP.y <= -radius) && (inP.x < width / 2 + radius - 3.5 * radius / 2 || inP.x > width / 2 + radius + 3.5 * radius / 2)) {
        outV = new THREE.Vector2(elast * inV.x, -elast * inV.y)
        outP = prevPos
        tau[n] = -tau[n] // See note for proof

    }
    // Ball collides left or right
    else if (inP.x >= width + radius || inP.x <= radius) {
        outV = new THREE.Vector2(-elast * inV.x, elast * inV.y)
        outP = prevPos
        tau[n] = Math.PI - tau[n] // See note for proof

    }
    // Do nothing
    else {
        outV = inV
        outP = inP
    }

    return [outV, outP]
}


// Two balls collide with each other
// @param v1 and v2 are current velocity of the balls, p1 and p2 are current positions of the balls, prevPos1-2 are positions of the two balls from last iteration, n and k are the slots in the spheres array
// @return outV1 and outV2 are the velocity after collision, outP1 and outP2 are the positions after collision
function ballCollision(v1, v2, p1, p2, prevPos1, prevPos2, n, k) {
    // Non elastic collision
    const elast = 0.95

    // Return variables
    let outV1 = new THREE.Vector2()
    let outV2 = new THREE.Vector2()
    let outPos1 = new THREE.Vector2()
    let outPos2 = new THREE.Vector2()
    let vDiff1 = new THREE.Vector2()
    let vDiff2 = new THREE.Vector2()
    let pDiff1 = new THREE.Vector2()
    let pDiff2 = new THREE.Vector2()

    // To not change data of inputs create copies since vectors are objects => passed by reference
    let v1Copy = v1.clone()
    let v2Copy = v2.clone()
    let p1Copy = p1.clone()
    let p2Copy = p2.clone()

    // Test if distance between balls are less than 2 radius
    if (p1Copy.distanceTo(p2Copy) < 2 * radius) {
        // To make code more readable create difference variables
        vDiff1.subVectors(v1Copy, v2Copy)
        pDiff1.subVectors(p1Copy, p2Copy)
        vDiff2.subVectors(v2Copy, v1Copy)
        pDiff2.subVectors(p2Copy, p1Copy)

        // Calculate new velocity vectors and correct tau for the new velocity
        outV1.subVectors(v1Copy, pDiff1.multiplyScalar(vDiff1.dot(pDiff1)).divideScalar(p1Copy.distanceToSquared(p2Copy))).multiplyScalar(elast)
        outPos1 = prevPos1
        tau[n] = outV1.angle()

        outV2.subVectors(v2Copy, pDiff2.multiplyScalar(vDiff2.dot(pDiff2)).divideScalar(p2Copy.distanceToSquared(p1Copy))).multiplyScalar(elast)
        outPos2 = prevPos2
        tau[k] = outV2.angle()

        // Test if one of the balls were still, then store initial velocity to later decide rolling or sliding
        if (v1.length() == 0) {
            Friction[n] = m * g * my
            initialVelocity[n] = outV1.length()
        }
        else if (v2.length() == 0) {
            Friction[k] = m * g * my
            initialVelocity[k] = outV2.length()
        }
    }
    // Do nothing
    else {
        outV1 = v1Copy
        outV2 = v2Copy
        outPos1 = p1Copy
        outPos2 = p2Copy
    }

    return [outV1, outV2, outPos1, outPos2]
}

// Function to handle user inputs to play the game
// @param i is current ball to make sure you play with the white ball
function userInputs(i) {
  // Key handler
  document.onkeydown = function (e) {
      if (e.keyCode === 67) {
          // C key
          controls.reset()
      }

      if (e.keyCode === 82) {
          // R key
          for (let k = 0; k < spheres.length; ++k) {
              p[k] = standPosition[k]
              v[k].x = 0
              v[k].y = 0
              Friction[k] = 0
          }
          tau[0] = 0
          counter = 0
          rowCounter = 0
      }

      if (e.keyCode === 39 && v.reduce((partialSum, a) => partialSum + a.length(), 0) == 0 && i == spheres.length - 1) {
          // right arrow
          tau[0] += angleChange
      } else if (e.keyCode === 37 && v.reduce((partialSum, a) => partialSum + a.length(), 0) == 0 && i == spheres.length - 1) {
          // left arrow
          tau[0] -= angleChange
      } else if (e.keyCode === 32 && v.reduce((partialSum, a) => partialSum + a.length(), 0) == 0 && i == spheres.length - 1) {
          // Space
          Force = Force_temp
          poolCue.visible = false
      } else if (e.keyCode === 38 && v.reduce((partialSum, a) => partialSum + a.length(), 0) == 0 && i == spheres.length - 1) {
          // Up arrow
          Force_temp += forceChange
          Force_temp = Math.min(Force_temp, maxPower)
          document.getElementById('powerbar').children[0].style.width = Force_temp / maxPower * 100 + '%'
      }
      else if (e.keyCode === 40 && v.reduce((partialSum, a) => partialSum + a.length(), 0) == 0 && i == spheres.length - 1) {
          // Down arrow
          Force_temp -= forceChange
          Force_temp = Math.max(Force_temp, minPower)
          document.getElementById('powerbar').children[0].style.width = Force_temp / maxPower * 100 + '%'
      }
  }
}

let rotWorldMatrix
// Rotate an object around an arbitrary axis in world space       
function rotateAroundWorldAxis(object, axis, radians) {
    rotWorldMatrix = new THREE.Matrix4()
    rotWorldMatrix.makeRotationAxis(axis.normalize(), radians)

    // old code for Three.JS pre r54:
    //  rotWorldMatrix.multiply(object.matrix);
    // new code for Three.JS r55+:
    rotWorldMatrix.multiply(object.matrix);               // pre-multiply

    object.matrix = rotWorldMatrix

    // old code for Three.js pre r49:
    // object.rotation.getRotationFromMatrix(object.matrix, object.scale);
    // old code for Three.js pre r59:
    // object.rotation.setEulerFromRotationMatrix(object.matrix);
    // code for r59+:
    object.rotation.setFromRotationMatrix(object.matrix)
}
// Code from https://stackoverflow.com/questions/11060734/how-to-rotate-a-3d-object-on-axis-three-js


// To get a random number between min and max (int)
function randomNum(min, max) {
    return Math.floor(Math.random() * (max - min)) + min
}

// The render loop
function render() {

  // Loop through each ball
  for (let i = 0; i < spheres.length; ++i) {
    prevPosition[i] = p[i]

    // Iterate position and velocity
    const eulerOut = euler(v[i], p[i], i)
    v[i] = eulerOut[0]
    p[i] = eulerOut[1]

    // Edge collision
    const edgeOut = edgeDetection(p[i], prevPosition[i], v[i], i)
    v[i] = edgeOut[0]
    p[i] = edgeOut[1]

    // Ball collision
    for (let j = i + 1; j < spheres.length; ++j) {
      let ballOut = ballCollision(v[i], v[j], p[i], p[j], prevPosition[i], prevPosition[j], i, j)
      v[i] = ballOut[0]
      v[j] = ballOut[1]
      p[i] = ballOut[2]
      p[j] = ballOut[3]
    }

    // Store initial velocity for the first ball, could be a better way?
    if (firstBall) {
      initialVelocity[i] = v[i].length()
      firstBall = false
    }

    // Go over to rolling friction when velocity goes under 5/7
    if (v[i].length() < motionOfInertia * initialVelocity[i] && v[i].length() != 0) {
      Friction[i] = motionOfInertia * m * g * theta // Rolling
      const rotVector = new THREE.Vector3(v[i].y, 0, -v[i].x) // Vector perpendicular https://mathworld.wolfram.com/PerpendicularVector.html
      rotateAroundWorldAxis(spheres[i], rotVector, v[i].length() / radius * h) // Rotate as ball is moving, v = wr
    }
    else if (v[i].length() > motionOfInertia * initialVelocity[i]) {
      Friction[i] = m * g * my // Sliding
    }

    // render pool cue if all balls are stationary
    if (v.reduce((partialSum, a) => partialSum + a.length(), 0) == 0 && i == spheres.length - 1 && poolCue) {
      poolCue.visible = true
      poolCue.position.set(p[0].x - Force_temp / 1000 * Math.cos(tau[0]), 0.01, p[0].y - Force_temp / 1000 * Math.sin(tau[0]))
      poolCue.rotation.y = Math.PI - tau[0]
    }

    // Handle user inputs to play
    userInputs(i)

    // OBS! Balls move along x- and z axes, table is in x,y
    spheres[i].position.x = p[i].x
    spheres[i].position.z = p[i].y
  }
  renderer.render(scene, camera)
}

function animate() {
  controls.update() // update camera position for OrbitControls
  setTimeout(function () { // setTimeout to limit fps
    requestAnimationFrame(animate)

  }, 1000 * h)
  setTimeout(function () { // Set timeout because of the time it takes to load the billiard table, can be removed when UI exists
    render()
  }, 20)
}

// Set up camera and background of the scene
function init() {
  scene.background = new THREE.Color('pink')

  camera.position.set(width / 2, 2, height / 2) // Place camera in the middle of the table and 2 units above
  controls.target = new THREE.Vector3(width / 2, 0, height / 2) // Point camera at center of table
  controls.enablePan = false // false removes ability to pan the camera
  controls.maxDistance = 4.5 // max zoom out, inf is max
  controls.minDistance = 3 // max zoom in, 0 is min
  controls.maxPolarAngle = Math.PI / 2.3 // max angle rotation
  controls.saveState() // save position to be able to get here later

  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)
}


// Set up ambient and a point light to the scene
function setLight() {
  const light = new THREE.AmbientLight(0xffffff, 0.2) // soft white light; color, intensity
  scene.add(light)
  const pointLight = new THREE.PointLight(0xffffff, 1, 0) // Color, near, far
  pointLight.position.set(width / 2, 3, height / 2) // Position the point light
  pointLight.shadow.mapSize.width = 1024 // Shadow quality
  pointLight.shadow.mapSize.height = 1024
  pointLight.castShadow = true
  scene.add(pointLight)
}

init()
setLight()
animate()
