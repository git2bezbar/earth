import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* Creating the scene */

const scene = new THREE.Scene();
scene.background = new THREE.Color("#000000");

/* Creating the camera */

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, .1, 1000);
camera.position.set(0, 15, 50);

/* Creating the renderer */

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.physicallyCorrectLights = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

/* Creating the drag and drop system */

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.dampingFactor = 0.75;
controls.enableDamping = true;

/* Adding a linear light that reproduces the sunlight */

const sunLight = new THREE.DirectionalLight(new THREE.Color("#FFFFFF"), 3.5);
sunLight.position.set(10, 20, 10);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 512;
sunLight.shadow.mapSize.height = 512;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 100;
sunLight.shadow.camera.left = -10;
sunLight.shadow.camera.bottom = -10;
sunLight.shadow.camera.top = 10;
sunLight.shadow.camera.right = 10;
scene.add(sunLight);

/* Adding an ambient light to avoid sharp shadows */

const ambientLight = new THREE.AmbientLight( 'white', 0.25 );
scene.add(ambientLight);

/* Setting all the stuff for the animation */

(async function animate() {

  /* Loading all the textures */

  let textures = {
    bump: await new THREE.TextureLoader().loadAsync("assets/earthbump.jpg"),
    map: await new THREE.TextureLoader().loadAsync("assets/earthmap.jpg"),
    spec: await new THREE.TextureLoader().loadAsync("assets/earthspec.jpg"),
    planeTrailMask: await new THREE.TextureLoader().loadAsync("assets/mask.png"),
    back: await new THREE.TextureLoader().loadAsync("assets/surprise.png")
  };

  /* Creating a space background with stars */

  const starVertices = [];
  for (let i = 0; i < 10000; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    starVertices.push(x, y, z);
  }

  let starGeometry = new THREE.BufferGeometry();
  const starMaterial = new THREE.PointsMaterial({color: 0xffffff});

  starGeometry.setAttribute('position', 
    new THREE.Float32BufferAttribute(starVertices, 3));

  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);

  /* Loading the plane model */

  const plane = (await new GLTFLoader().loadAsync("assets/plane/scene.glb"))
    .scene.children[0];
  let planesData = [];

  for (let i = 1; i <= 10; i++) {
    planesData.push(
      makePlane(plane, textures.planeTrailMask, scene),
    );
  }

  /* Adding Earth */

  let sphere = new THREE.Mesh(
    new THREE.SphereGeometry(10, 70, 70),
    new THREE.MeshPhysicalMaterial({
      map: textures.map,
      roughnessMap: textures.spec,
      bumpMap: textures.bump,
      bumpScale: 5,
      sheen: 1,
      sheenRoughness: 0.75,
      sheenColor: new THREE.Color("#6a00ff").convertSRGBToLinear(),
      clearcoat: 0.5,
    }),
  );
  sphere.receiveShadow = true;
  let earth = new THREE.Group();
  earth.add(sphere);

  /* Adding the surprise */

  let surprise = new THREE.Mesh(
    new THREE.SphereGeometry(9.9, 70, 70),
    new THREE.MeshPhysicalMaterial({
      map: textures.back,
      side: THREE.BackSide,
      roughnessMap: textures.spec,
      bumpMap: textures.bump,
      bumpScale: 5,
      sheen: 1,
      sheenRoughness: 0.75,
      sheenColor: new THREE.Color("#6a00ff").convertSRGBToLinear(),
      clearcoat: 0.5,
    }),
  );
  earth.add(surprise);

  /* Adding the cube */

  let cube = new THREE.Mesh(
    new THREE.BoxGeometry(.125, .25, .125),
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#5C56DF").convertSRGBToLinear(),
      opacity: 1,
    }),
  );
  cube.position.set(7.125, 7.125, .125);
  cube.rotation.set(0, 0, 40);
  earth.add(cube);
  scene.add(earth);

  
  /* Setting a clock */

  let clock = new THREE.Clock();
  
  
  renderer.setAnimationLoop(() => {
    let delta = clock.getDelta();
    earth.rotation.y += .0005;

    /* Animating the planes */
    
    planesData.forEach(planeData => {
      let plane = planeData.group;

      plane.position.set(0, 0, 0);
      plane.rotation.set(0, 0, 0);
      plane.updateMatrixWorld();

      planeData.rot += delta * 0.25;
      plane.rotateOnAxis(planeData.randomAxis, planeData.randomAxisRot);
      plane.rotateOnAxis(new THREE.Vector3(0, 1, 0), planeData.rot);
      plane.rotateOnAxis(new THREE.Vector3(0, 0, 1), planeData.rad);
      plane.translateY(planeData.yOff);
      plane.rotateOnAxis(new THREE.Vector3(1, 0, 0), +Math.PI * 0.5);
    });

    controls.update();
    renderer.render(scene, camera);
  });
})();

function makePlane(planeMesh, trailTexture, scene) {
  let plane = planeMesh.clone();
  plane.scale.set(0.001, 0.001, 0.001);
  plane.position.set(0, 0, 0);
  plane.rotation.set(0, 0, 0);
  plane.updateMatrixWorld();

  plane.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  let trail = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 2),
    new THREE.MeshPhysicalMaterial({
      roughness: 0.4,
      metalness: 0,
      transmission: 1,
      transparent: true,
      opacity: 1,
      alphaMap: trailTexture,
    }),
  );
  trail.rotateX(Math.PI);
  trail.translateY(1.1);
  plane.receiveShadow = true;


  let group = new THREE.Group();
  group.add(plane);
  group.add(trail);

  scene.add(group);

  return {
    group,
    rot: Math.random() * Math.PI * 2.0,
    rad: Math.random() * Math.PI * 0.45 + 0.2,
    yOff: 10.5 + Math.random() * 1.0,
    randomAxis: new THREE.Vector3(nr(), nr(), nr()).normalize(),
    randomAxisRot: Math.random() * Math.PI * 2.0,
  };
}

function nr() {
  return Math.random() * 2.0 - 1.0;
}