"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

const TEXTURE_SIZE = 4096
const MAX_WORDS = 100000

const vertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0, 1);
    v_texCoord = (a_position + 1.0) / 2.0;
  }
`;

const fragmentShaderSource = `
  precision highp float;
  varying vec2 v_texCoord;
  uniform sampler2D u_neuronState;
  uniform sampler2D u_wordData;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_mouse;
  uniform int u_wordCount;

  vec3 hash33(vec3 p3) {
    p3 = fract(p3 * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yxz+33.33);
    return fract((p3.xxy + p3.yxx)*p3.zyx);
  }

  float voronoi(vec2 x) {
    vec2 n = floor(x);
    vec2 f = fract(x);

    float m = 8.0;
    for(int j=-1; j<=1; j++)
    for(int i=-1; i<=1; i++) {
      vec2 g = vec2(float(i),float(j));
      vec3 o = hash33(vec3(n + g, u_time * 0.1)) * 0.5 + 0.5;
      vec2 r = g - f + (0.5 + 0.5*sin(u_time + 6.2831*o.xy));
      float d = dot(r,r);
      m = min(m, d);
    }
    return sqrt(m);
  }

  void main() {
    vec2 uv = v_texCoord;
    vec2 pos = uv * u_resolution;
    
    float v = voronoi(pos * 0.01);
    
    vec3 col = vec3(v);
    
    // Simulate neuron activation based on mouse proximity
    float activation = 1.0 - smoothstep(0.0, 0.2, length(uv - u_mouse));
    col = mix(col, vec3(1.0, 0.5, 0.0), activation);
    
    // Add some "synapses"
    float synapses = smoothstep(0.3, 0.31, sin(pos.x * 0.1) + sin(pos.y * 0.1));
    col = mix(col, vec3(0.0, 0.5, 1.0), synapses * 0.5);
    
    // Incorporate neuron state and word data
    vec4 neuronState = texture2D(u_neuronState, uv);
    vec4 wordData = texture2D(u_wordData, vec2(float(gl_FragCoord.x) / u_resolution.x, 0.5));
    
    col = mix(col, neuronState.rgb, 0.3);
    col += wordData.rgb * 0.1;
    
    gl_FragColor = vec4(col, 1.0);
  }
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create program");
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

function createAndSetupTexture(gl: WebGLRenderingContext) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return texture;
}

export default function HighCapacityNeuralProcessor() {
  const [words, setWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState('');
  const [inputWord, setInputWord] = useState('');
  const [outputWord, setOutputWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const neuronStateTextureRef = useRef<WebGLTexture | null>(null);
  const wordDataTextureRef = useRef<WebGLTexture | null>(null);
  const mouseRef = useRef<[number, number]>([0.5, 0.5]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
      setError('WebGL is not supported in your browser.');
      return;
    }
    glRef.current = gl;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
      setError('Failed to compile shaders.');
      return;
    }

    const program = createProgram(gl, vertexShader, fragmentShader);

    if (!program) {
      setError('Failed to create shader program.');
      return;
    }

    programRef.current = program;

    // Set up textures
    neuronStateTextureRef.current = createAndSetupTexture(gl);
    wordDataTextureRef.current = createAndSetupTexture(gl);

    // Initialize textures with random data
    const neuronStateData = new Float32Array(TEXTURE_SIZE * TEXTURE_SIZE * 4);
    const wordData = new Float32Array(TEXTURE_SIZE * 4);
    for (let i = 0; i < neuronStateData.length; i++) {
      neuronStateData[i] = Math.random();
    }
    for (let i = 0; i < wordData.length; i++) {
      wordData[i] = Math.random();
    }
    gl.bindTexture(gl.TEXTURE_2D, neuronStateTextureRef.current);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TEXTURE_SIZE, TEXTURE_SIZE, 0, gl.RGBA, gl.FLOAT, neuronStateData);
    gl.bindTexture(gl.TEXTURE_2D, wordDataTextureRef.current);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TEXTURE_SIZE, 1, 0, gl.RGBA, gl.FLOAT, wordData);

    // Set up vertex buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
      -1, -1,
      1, -1,
      -1, 1,
      1, 1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    const animate = (time: number) => {
      render(time);
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = [
        (event.clientX - rect.left) / canvas.width,
        1 - (event.clientY - rect.top) / canvas.height,
      ];
    });

  }, []);

  const render = useCallback((time: number) => {
    const gl = glRef.current;
    const program = programRef.current;
    if (!gl || !program) return;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    // Update uniforms
    gl.uniform1f(gl.getUniformLocation(program, "u_time"), time * 0.001);
    gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), gl.canvas.width, gl.canvas.height);
    gl.uniform2f(gl.getUniformLocation(program, "u_mouse"), mouseRef.current[0], mouseRef.current[1]);
    gl.uniform1i(gl.getUniformLocation(program, "u_wordCount"), words.length);

    // Bind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, neuronStateTextureRef.current);
    gl.uniform1i(gl.getUniformLocation(program, "u_neuronState"), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, wordDataTextureRef.current);
    gl.uniform1i(gl.getUniformLocation(program, "u_wordData"), 1);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }, [words.length]);

  const addWord = useCallback((word: string) => {
    if (!words.includes(word) && words.length < MAX_WORDS) {
      setWords(prev => [...prev, word]);
      
      // Update word data texture
      const gl = glRef.current;
      if (gl && wordDataTextureRef.current) {
        const wordData = new Float32Array(TEXTURE_SIZE * 4);
        // Encode word data into texture
        for (let i = 0; i < word.length; i++) {
          wordData[i * 4] = word.charCodeAt(i) / 255;
        }
        gl.bindTexture(gl.TEXTURE_2D, wordDataTextureRef.current);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, words.length, TEXTURE_SIZE, 1, gl.RGBA, gl.FLOAT, wordData);
      }
    }
  }, [words]);

  const processInput = useCallback((word: string) => {
    const index = words.indexOf(word);
    if (index !== -1) {
      // Simulate processing by updating neuron state texture
      const gl = glRef.current;
      if (gl && neuronStateTextureRef.current) {
        const neuronData = new Float32Array(TEXTURE_SIZE * TEXTURE_SIZE * 4);
        // Update neuron state based on input word
        for (let i = 0; i < TEXTURE_SIZE * TEXTURE_SIZE; i++) {
          neuronData[i * 4] = Math.random(); // Simplified activation
        }
        gl.bindTexture(gl.TEXTURE_2D, neuronStateTextureRef.current);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TEXTURE_SIZE, TEXTURE_SIZE, gl.RGBA, gl.FLOAT, neuronData);
      }

      // For demonstration, we'll still output a word
      const outputIndex = (index + 1) % words.length;
      setOutputWord(words[outputIndex]);
    } else {
      setOutputWord('Unknown word');
    }
  }, [words]);

  const handleAddWord = useCallback(() => {
    if (newWord && !words.includes(newWord)) {
      addWord(newWord);
      setNewWord('');
    }
  }, [newWord, words, addWord]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        setIsProcessing(true);
        setProgress(0);
        const text = await file.text();
        const wordsFromFile = text.toLowerCase().match(/\b\w+\b/g) || [];
        const totalWords = Math.min(wordsFromFile.length, MAX_WORDS - words.length);
        
        for (let i = 0; i < totalWords; i++) {
          addWord(wordsFromFile[i]);
          setProgress((i + 1) / totalWords * 100);
          // Use setTimeout to allow UI updates
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        setIsProcessing(false);
        setError(null);
      } catch (err) {
        setError('Error reading file. Please try again.');
        setIsProcessing(false);
      }
    }
  }, [addWord, words.length]);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-center">High Capacity Light-Based Neural Processor</h1>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add Words to Neural Network</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="Enter a new word"
              className="flex-grow"
            />
            <Button onClick={handleAddWord}>Add Word</Button>
          </div>
          <div className="flex items-center space-x-2">
            <Input
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="flex-grow"
            />
          </div>
          {isProcessing && (
            <div className="mt-4">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground mt-2">Processing words: {progress.toFixed(0)}%</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Word List ({words.length} / {MAX_WORDS})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-60 overflow-y-auto">
              <ul className="list-disc list-inside">
                {words.slice(0, 100).map((word, index) => (
                  <li key={index} className="mb-1">{word}</li>
                ))}
                {words.length > 100 && (
                  <li className="mb-1">... and {words.length - 100} more words</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Neural Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="inputWord">Input Word:</Label>
                <Input
                  id="inputWord"
                  type="text"
                  value={inputWord}
                  onChange={(e) => setInputWord(e.target.value)}
                  placeholder="Enter input word"
                />
              </div>
              <Button onClick={() => processInput(inputWord)}>Process</Button>
              <Separator />
              <div>
                <Label>Output Word:</Label>
                <p className="text-lg font-semibold mt-1">{outputWord}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>High Capacity Light-Based Neural Network Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <canvas 
            ref={canvasRef} 
            width={512} 
            height={512} 
            className="w-full h-auto border border-gray-300"
          />
        </CardContent>
      </Card>
    </div>
  )
}