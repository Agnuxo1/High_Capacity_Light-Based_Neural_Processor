# High Capacity Light-Based Neural Processor

## Abstract

This repository presents a novel architecture for neural networks based on simulated optical physics, utilizing ray tracing and holographic systems. The project, developed by Francisco Angulo de Lafuente, explores the potential of light-based computing in neural processing. By converting each neuron into a pixel, the entire neural network is represented as a dynamic image, effectively using the image itself as part of the processing mechanism.

## Introduction

Traditional neural networks rely on tensor calculations and weight adjustments. This project takes a radically different approach by simulating optical phenomena to perform neural computations. The core idea is to leverage the natural properties of light, such as intensity, tone, frequency, refraction, and backlighting, to emerge computational results without explicit calculations.

This approach is analogous to mixing yellow and blue paint to produce green. The resulting color emerges naturally from the interaction of the components, without the need for explicit color calculations. Similarly, our light-based neural processor allows computational results to emerge from the interactions of simulated light properties.

## Key Concepts

1. **Optical Physics Simulation**: The project uses ray tracing techniques to simulate the behavior of light within the neural network.
2. **Holographic Systems**: Holographic principles are employed to encode and process information within the simulated optical environment.
3. **Neural-Pixel Mapping**: Each neuron in the network is represented as a pixel in a dynamic image, creating a visual representation of the entire neural state.
4. **Emergent Computation**: Results are not explicitly calculated but emerge from the interactions of simulated optical properties.

## Implementation

The current implementation provides a proof-of-concept for the light-based neural processor. It includes:

1. A WebGL-based visualization of the neural network state.
2. A simulated word processing system that demonstrates the concept of emergent computation.
3. A user interface for adding words to the network and processing inputs.

### Key Components

- `HighCapacityNeuralProcessor`: The main React component that orchestrates the neural processor's functionality.
- WebGL Shaders: Vertex and fragment shaders that simulate the optical properties and visualize the neural state.
- Texture-based Data Storage: Uses WebGL textures to store and manipulate the neural state and word data.

## Usage

To run the project:

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open `http://localhost:3000` in your browser

## Future Work

1. Enhance the optical physics simulation to more accurately represent real-world light behavior.
2. Implement more complex neural architectures within the light-based paradigm.
3. Explore potential hardware implementations that could realize this concept in physical optical systems.
4. Investigate applications in natural language processing, computer vision, and other AI domains.

## References

1. Whitted, T. (1980). An improved illumination model for shaded display. Communications of the ACM, 23(6), 343-349. (Ray tracing)
2. Gabor, D. (1948). A new microscopic principle. Nature, 161(4098), 777-778. (Holography)
3. Goodman, J. W. (2005). Introduction to Fourier optics. Roberts and Company Publishers. (Optical information processing)
4. Shen, Y., Harris, N. C., Skirlo, S., Prabhu, M., Baehr-Jones, T., Hochberg, M., ... & Soljačić, M. (2017). Deep learning with coherent nanophotonic circuits. Nature Photonics, 11(7), 441-446. (Optical neural networks)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.