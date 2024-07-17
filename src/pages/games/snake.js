import React, { useState, useEffect, useCallback } from 'react';
import Layout from "../../components/layout";
import PageHeader from "../../components/header";
import SEO from '../../components/seo';
import { useTranslation } from "react-i18next";

const GRID_SIZE = 30;
const CELL_SIZE = 25;
const INITIAL_SNAKE = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
const INITIAL_FOOD = { x: 15, y: 15 };
const INITIAL_DIRECTION = 'RIGHT';

const SnakeGame = () => {
    const [snake, setSnake] = useState(INITIAL_SNAKE);
    const [food, setFood] = useState(INITIAL_FOOD);
    const [direction, setDirection] = useState(INITIAL_DIRECTION);
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const { t } = useTranslation();

    const moveSnake = useCallback(() => {
        if (gameOver) return;

        const newSnake = [...snake];
        const head = { ...newSnake[0] };

        switch (direction) {
            case 'UP':
                head.y -= 1;
                break;
            case 'DOWN':
                head.y += 1;
                break;
            case 'LEFT':
                head.x -= 1;
                break;
            case 'RIGHT':
                head.x += 1;
                break;
        }

        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
            setGameOver(true);
            return;
        }

        if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
            setGameOver(true);
            return;
        }

        newSnake.unshift(head);

        if (head.x === food.x && head.y === food.y) {
            setScore(prevScore => prevScore + 1);
            generateFood(newSnake);
        } else {
            newSnake.pop();
        }

        setSnake(newSnake);
    }, [snake, direction, food, gameOver]);

    const generateFood = (currentSnake) => {
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE)
            };
        } while (currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
        setFood(newFood);
    };

    const handleKeyPress = useCallback((e) => {
        switch (e.key) {
            case 'ArrowUp':
                setDirection(prevDirection => prevDirection !== 'DOWN' ? 'UP' : prevDirection);
                break;
            case 'ArrowDown':
                setDirection(prevDirection => prevDirection !== 'UP' ? 'DOWN' : prevDirection);
                break;
            case 'ArrowLeft':
                setDirection(prevDirection => prevDirection !== 'RIGHT' ? 'LEFT' : prevDirection);
                break;
            case 'ArrowRight':
                setDirection(prevDirection => prevDirection !== 'LEFT' ? 'RIGHT' : prevDirection);
                break;
        }
    }, []);

    useEffect(() => {
        const gameLoop = setInterval(moveSnake, 150);
        window.addEventListener('keydown', handleKeyPress);

        return () => {
            clearInterval(gameLoop);
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [moveSnake, handleKeyPress]);

    const resetGame = () => {
        setSnake(INITIAL_SNAKE);
        setFood(INITIAL_FOOD);
        setDirection(INITIAL_DIRECTION);
        setGameOver(false);
        setScore(0);
    };

    const renderSnakeSegment = (segment, index, snake, direction) => {
        const isHead = index === 0;
        const prevSegment = snake[index - 1] || segment;
    
        let rotation = 0;
        if (prevSegment.x < segment.x || (isHead && direction === 'RIGHT')) rotation = 0;
        else if (prevSegment.y < segment.y || (isHead && direction === 'DOWN')) rotation = 90;
        else if (prevSegment.x > segment.x || (isHead && direction === 'LEFT')) rotation = 180;
        else if (prevSegment.y > segment.y || (isHead && direction === 'UP')) rotation = 270;
    
        const radius = CELL_SIZE / 2   
    
        return (
            <g
                key={index}
                transform={`translate(${segment.x * CELL_SIZE}, ${segment.y * CELL_SIZE}) rotate(${rotation}, ${CELL_SIZE / 2}, ${CELL_SIZE / 2})`}
            >
                {isHead ? (
                    <circle cx={CELL_SIZE / 2} cy={CELL_SIZE / 2} r={radius} fill="blue" />
                ) : (
                    <circle cx={CELL_SIZE / 2} cy={CELL_SIZE / 2} r={radius} fill="blue" />
                )}
                {isHead && (
                    <>
                        <circle cx={CELL_SIZE / 3} cy={CELL_SIZE / 3} r="2" fill="white" />
                        <circle cx={CELL_SIZE * 2 / 3} cy={CELL_SIZE / 3} r="2" fill="white" />
                        <circle cx={CELL_SIZE / 3} cy={CELL_SIZE / 3} r="1" fill="black" />
                        <circle cx={CELL_SIZE * 2 / 3} cy={CELL_SIZE / 3} r="1" fill="black" />
                    </>
                )}
            </g>
        );
    };

    return (
        <Layout>
            <PageHeader />
            <div className="flex flex-col items-center justify-center">
                <div className="relative bg-green-50 rounded-lg shadow-lg overflow-hidden">
                    <svg width={GRID_SIZE * CELL_SIZE} height={GRID_SIZE * CELL_SIZE}>
                        {snake.map(renderSnakeSegment)}
                        <text
                            x={food.x * CELL_SIZE + CELL_SIZE / 2}
                            y={food.y * CELL_SIZE + CELL_SIZE / 2}
                            fontSize={CELL_SIZE}
                            textAnchor="middle"
                            dominantBaseline="central"
                        >
                            🍎
                        </text>
                    </svg>
                    {gameOver && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                            <div className="text-white text-center">
                                <p className="text-3xl font-bold mb-4">{t('game_over')}</p>
                                <button
                                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
                                    onClick={resetGame}
                                >
                                    {t('restart_game')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-4 text-xl font-semibold text-green-800">{t('gain_score', { score: score})} </div>
            </div>
        </Layout>
    );
};

export default SnakeGame;

export const Head = () => (
  <SEO
    title="Free Snake Online"
    description="Enjoy the classic free snake game online. Control the snake to eat food, and grow longer. Avoid hitting the wall or the snake's body.. No download needed."
    keywords="Snake, Play snake online, Free snake game, Snake eat food, Snake Claude write, Online snake game"
    canonicalUrl="https://gallery.selfboot.cn/games/snake/"
  />
);