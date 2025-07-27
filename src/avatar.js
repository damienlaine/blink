import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Avatar {
    constructor(scene) {
        this.scene = scene;
        this.loader = new GLTFLoader();
        this.gltf = null;
        this.morphTargetMeshes = [];
        this.eyeTarget = new THREE.Vector3();
    }

    async load() {
        return new Promise((resolve, reject) => {
            this.loader.load(
                'https://assets.codepen.io/9177687/raccoon_head.glb',
                (gltf) => {
                    this.gltf = gltf;
                    this.scene.add(this.gltf.scene);

                    this.gltf.scene.scale.set(5, 5, 5);
                    this.gltf.scene.position.set(0, 0, 0);

                    gltf.scene.traverse((object) => {
                        if (object.isMesh && object.morphTargetDictionary) {
                            this.morphTargetMeshes.push(object);
                        }
                    });

                    if (this.morphTargetMeshes.length > 0) {
                        console.log('Successfully found mesh with morph targets.');
                        resolve();
                    } else {
                        reject('Could not find a mesh with morph targets.');
                    }
                },
                undefined,
                (error) => reject(error)
            );
        });
    }

    updateEyeGaze(target) {
        if (!this.gltf || this.morphTargetMeshes.length === 0) {
            return;
        }

        // The target vector is in world space. We need to convert it to the local space of the avatar's head.
        this.gltf.scene.worldToLocal(this.eyeTarget.copy(target));
        this.eyeTarget.normalize();

        const sensitivity = 0.5;
        const blendshapes = {
            eyeLookUp: Math.max(0, this.eyeTarget.y) * sensitivity,
            eyeLookDown: Math.max(0, -this.eyeTarget.y) * sensitivity,
            eyeLookLeft: Math.max(0, this.eyeTarget.x) * sensitivity,
            eyeLookRight: Math.max(0, -this.eyeTarget.x) * sensitivity,
        };

        this.updateBlendshapes(blendshapes);
    }

    updateBlendshapes(blendshapes) {
        for (const mesh of this.morphTargetMeshes) {
            for (const [name, value] of Object.entries(blendshapes)) {
                let leftName, rightName;

                if (name === 'eyeLookUp' || name === 'eyeLookDown') {
                    leftName = `${name}Left`;
                    rightName = `${name}Right`;
                } else if (name === 'eyeLookLeft') {
                    leftName = 'eyeLookOutLeft';
                    rightName = 'eyeLookInRight';
                } else if (name === 'eyeLookRight') {
                    leftName = 'eyeLookInLeft';
                    rightName = 'eyeLookOutRight';
                }

                if (leftName && mesh.morphTargetDictionary[leftName] !== undefined) {
                    mesh.morphTargetInfluences[mesh.morphTargetDictionary[leftName]] = value;
                }
                if (rightName && mesh.morphTargetDictionary[rightName] !== undefined) {
                    mesh.morphTargetInfluences[mesh.morphTargetDictionary[rightName]] = value;
                }
            }
        }
    }

    setScale(scale) {
        if (this.gltf) {
            this.gltf.scene.scale.set(scale, scale, scale);
        }
    }
}
