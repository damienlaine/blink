import * as THREE from 'three';

/**
 * Returns the world-space dimensions of the viewport at `depth` units away from
 * the camera.
 * @param {THREE.PerspectiveCamera} camera
 * @param {number} depth
 * @returns {THREE.Vector2}
 */
export function getViewportSizeAtDepth(camera, depth) {
  const viewportHeightAtDepth =
    2 * depth * Math.tan(THREE.MathUtils.degToRad(0.5 * camera.fov));
  const viewportWidthAtDepth = viewportHeightAtDepth * camera.aspect;
  return new THREE.Vector2(viewportWidthAtDepth, viewportHeightAtDepth);
}

/**
 * Creates a `THREE.Mesh` which fully covers the `camera` viewport, is `depth`
 * units away from the camera and uses `material`.
 * @param {THREE.PerspectiveCamera} camera
 * @param {number} depth
 * @param {THREE.Material} material
 * @returns {THREE.Mesh}
 */
export function createCameraPlaneMesh(camera, depth, material) {
  if (camera.near > depth || depth > camera.far) {
    console.warn("Camera plane geometry will be clipped by the `camera`!");
  }
  const viewportSize = getViewportSizeAtDepth(camera, depth);
  const cameraPlaneGeometry = new THREE.PlaneGeometry(
    viewportSize.width,
    viewportSize.height
  );
  cameraPlaneGeometry.translate(0, 0, -depth);

  return new THREE.Mesh(cameraPlaneGeometry, material);
}
