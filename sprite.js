let scene, camera, renderer, clock;
    let mixer, actions = [];
    let secondModelMixer, secondModelActions = [];
    let isWireframe = false;
    let loadedModel;
    let sound, secondSound;
    let lights, params;

    const loader = new THREE.GLTFLoader();

    init();

    function init() {
      clock = new THREE.Clock();
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x00aaff);

      camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(-5, 25, 20);

      const listener = new THREE.AudioListener();
      camera.add(listener);

      sound = new THREE.Audio(listener);
      secondSound = new THREE.Audio(listener);

      const audioLoader = new THREE.AudioLoader();
      audioLoader.load('assets/can_opening.mp3', buffer => {
        sound.setBuffer(buffer);
        sound.setLoop(false);
        sound.setVolume(1.0);
      });
      audioLoader.load('assets/Can crush.mp3', buffer => {
        secondSound.setBuffer(buffer);
        secondSound.setLoop(false);
        secondSound.setVolume(1.0);
      });

      const ambient = new THREE.HemisphereLight(0xffffbb, 0x080820, 4);
      scene.add(ambient);

      lights = {
        spot: new THREE.SpotLight()
      };
      lights.spot.visible = true;
      lights.spot.position.set(0, 20, 0);
      lights.spotHelper = new THREE.SpotLightHelper(lights.spot);
      lights.spotHelper.visible = false;
      scene.add(lights.spotHelper);
      scene.add(lights.spot);

      params = {
        spot: {
          enable: true,
          color: 0xffffff,
          distance: 20,
          angle: Math.PI / 2,
          penumbra: 0,
          helper: false,
          moving: false
        }
      };

      const gui = new dat.GUI({ autoPlace: false });
      document.getElementById('gui-container').appendChild(gui.domElement);
      const spot = gui.addFolder('Spot');
      spot.open();
      spot.add(params.spot, 'enable').onChange(v => lights.spot.visible = v);
      spot.addColor(params.spot, 'color').onChange(v => lights.spot.color = new THREE.Color(v));
      spot.add(params.spot, 'distance', 0, 20).onChange(v => lights.spot.distance = v);
      spot.add(params.spot, 'angle', 0.1, 6.28).onChange(v => lights.spot.angle = v);
      spot.add(params.spot, 'penumbra', 0, 1).onChange(v => lights.spot.penumbra = v);
      spot.add(params.spot, 'helper').onChange(v => lights.spotHelper.visible = v);
      spot.add(params.spot, 'moving');

      const canvas = document.getElementById('threeContainer');
      renderer = new THREE.WebGLRenderer({ canvas });
      renderer.setPixelRatio(window.devicePixelRatio);
      resize();

      const controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.target.set(1, 2, 0);
      controls.update();

      window.addEventListener('resize', resize, false);

      // 加载初始静态模型
      loadStaticModel('assets/sprite.glb');

      // Open 动画
      document.getElementById("btn").addEventListener('click', async () => {
        await loadModel('assets/sprite-animation1.glb', false);
        if (actions.length > 0) {
          actions.forEach(action => {
            action.reset();
            action.play();
          });
          if (sound.isPlaying) sound.stop();
          sound.play();
        }
      });

      // Switch 动画
      document.getElementById("switchModel").addEventListener('click', async () => {
        await loadModel('assets/sprite-animation2.glb', true);
        if (secondModelActions.length > 0) {
          secondModelActions.forEach(action => {
            action.reset();
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            action.play();
          });
          if (secondSound.isPlaying) secondSound.stop();
          secondSound.play();
        }
      });

      document.getElementById("toggleWireframe").addEventListener('click', () => {
        isWireframe = !isWireframe;
        toggleWireframe(isWireframe);
      });

      document.getElementById("Rotate").addEventListener('click', () => {
        if (loadedModel) {
          loadedModel.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.PI / 8);
        }
      });

      animate();
    }

    // 加载动画模型
    function loadModel(modelPath, isSecond = false) {
      return new Promise(resolve => {
        if (loadedModel) scene.remove(loadedModel);
        loader.load(modelPath, gltf => {
          const model = gltf.scene;
          model.position.set(0, 0, 0);
          scene.add(model);
          loadedModel = model;

          const modelMixer = new THREE.AnimationMixer(model);
          const modelActions = gltf.animations.map(clip => modelMixer.clipAction(clip));

          if (isSecond) {
            secondModelMixer = modelMixer;
            secondModelActions = modelActions;
          } else {
            mixer = modelMixer;
            actions = modelActions;
          }
          resolve();
        });
      });
    }

    // 加载静态模型
    function loadStaticModel(modelPath) {
      loader.load(modelPath, gltf => {
        if (loadedModel) scene.remove(loadedModel);
        const model = gltf.scene;
        model.position.set(0, 0, 0);
        scene.add(model);
        loadedModel = model;
      });
    }

    function toggleWireframe(enable) {
      scene.traverse(object => {
        if (object.isMesh) {
          object.material.wireframe = enable;
        }
      });
    }

    function animate() {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (mixer) mixer.update(delta);
      if (secondModelMixer) secondModelMixer.update(delta);
      renderer.render(scene, camera);

      if (params.spot.moving) {
        lights.spot.position.x = Math.sin(clock.getElapsedTime()) * 5;
        lights.spotHelper.update();
      }
    }

    function resize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
 