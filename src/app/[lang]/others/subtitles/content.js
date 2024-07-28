"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import debounce from 'lodash.debounce';
import { useI18n } from "@/app/i18n/client";
import usePersistentState from '@/app/components/PersistentState';

const ImageSubtitleTool = () => {
  const [uploadedImage, setUploadedImage] = usePersistentState('imageSubtitleTool_image', null);
  const [subtitles, setSubtitles] = usePersistentState('imageSubtitleTool_subtitles', []);
  const [subtitleHeightPercent, setSubtitleHeightPercent] = usePersistentState('imageSubtitleTool_subtitleHeight', 10);
  const [fontSizePercent, setFontSizePercent] = usePersistentState('imageSubtitleTool_fontSize', 50);

  const [fontColor, setFontColor] = usePersistentState('imageSubtitleTool_fontColor', '#FFFFFF');
  const [fontFamily, setFontFamily] = usePersistentState('imageSubtitleTool_fontFamily', '"Microsoft YaHei", "微软雅黑", sans-serif');
  const [textShadow, setTextShadow] = usePersistentState('imageSubtitleTool_textShadow', false);
  const [textStroke, setTextStroke] = usePersistentState('imageSubtitleTool_textStroke', false);
  const [backgroundColor, setBackgroundColor] = usePersistentState('imageSubtitleTool_bgColor', '#000000');
  const [backgroundOpacity, setBackgroundOpacity] = usePersistentState('imageSubtitleTool_bgOpacity', 0.5);
  const [useGradient, setUseGradient] = usePersistentState('imageSubtitleTool_useGradient', false);
  const [gradientColor, setGradientColor] = usePersistentState('imageSubtitleTool_gradientColor', '#000000');
  
  const [outputImage, setOutputImage] = useState(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const { t } = useI18n();

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target.result);
        setImageSize({ width: 0, height: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  const addSubtitle = () => {
    setSubtitles([...subtitles, '']);
  };

  const updateSubtitle = (index, value) => {
    const newSubtitles = [...subtitles];
    newSubtitles[index] = value;
    setSubtitles(newSubtitles);
  };

  const removeSubtitle = (index) => {
    const newSubtitles = subtitles.filter((_, i) => i !== index);
    setSubtitles(newSubtitles);
  };

  const generateSubtitledImage = useCallback(() => {
    if (!uploadedImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
      const subtitleHeight = Math.round(img.height * (subtitleHeightPercent / 100));
      const fontSize = Math.round(subtitleHeight * (fontSizePercent / 100));
      const totalHeight = img.height + (subtitles.length > 0 ? (subtitles.length - 1) * subtitleHeight : 0);
      canvas.width = img.width;
      canvas.height = totalHeight;

      ctx.drawImage(img, 0, 0);

      const originalBottomPart = ctx.getImageData(0, img.height - subtitleHeight, img.width, subtitleHeight);

      const addSubtitleToImage = (text, y) => {
        ctx.save();

        // 背景
        if (useGradient) {
          const gradient = ctx.createLinearGradient(0, y, img.width, y);
          gradient.addColorStop(0, backgroundColor);
          gradient.addColorStop(1, gradientColor);
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = backgroundColor;
        }
        ctx.globalAlpha = backgroundOpacity;
        ctx.fillRect(0, y, img.width, subtitleHeight);
        ctx.globalAlpha = 1;

        ctx.fillStyle = fontColor;
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (textShadow) {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetX = 3;
          ctx.shadowOffsetY = 3;
        }

        if (textStroke) {
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.lineWidth = 4;
          ctx.lineJoin = 'round';
          ctx.miterLimit = 2;
          ctx.strokeText(text, img.width / 2, y + subtitleHeight / 2);
        }

        ctx.fillText(text, img.width / 2, y + subtitleHeight / 2);
        ctx.restore();
      };

      subtitles.forEach((subtitle, index) => {
        const y = img.height + index * subtitleHeight;
        if (index === 0) {
          addSubtitleToImage(subtitle, img.height - subtitleHeight);
        } else {
          ctx.putImageData(originalBottomPart, 0, y - subtitleHeight);
          addSubtitleToImage(subtitle, y - subtitleHeight);
        }
      });

      setOutputImage(canvas.toDataURL());
    };
    img.src = uploadedImage;
  }, [uploadedImage, subtitles, subtitleHeightPercent, fontColor, fontSizePercent, fontFamily, textShadow, textStroke, backgroundColor, backgroundOpacity, useGradient, gradientColor]);

  const debouncedGenerateSubtitledImage = useCallback(debounce(generateSubtitledImage, 300), [generateSubtitledImage]);

  useEffect(() => {
    debouncedGenerateSubtitledImage();
  }, [debouncedGenerateSubtitledImage]);

  const downloadImage = () => {
    if (outputImage) {
      const link = document.createElement('a');
      link.href = outputImage;
      link.download = 'subtitled_image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const replaceImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const clearImage = () => {
    setUploadedImage(null);
    setOutputImage(null);
    setImageSize({ width: 0, height: 0 });
    setSubtitles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row bg-gray-100">
      <div className="w-full lg:w-3/5 p-4 flex flex-col items-center justify-center bg-gray-200">
        {outputImage ? (
          <>
            <img src={outputImage} alt="Preview" className="max-w-full max-h-[80vh] object-contain mb-4" />
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={downloadImage} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                {t('downloadImage')}
              </button>
              <button onClick={replaceImage} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
                {t('replaceImage')}
              </button>
              <button onClick={clearImage} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
                {t('reset')}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <p className="mb-4">{t('uploadToStart')}</p>
            <button onClick={replaceImage} className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">
              {t('uploadImage')}
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleImageUpload}
          className="hidden"
          accept="image/*"
        />
      </div>

      <div className="w-full lg:w-2/5 p-4 bg-white overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">{t('subtitleContent')}</h2>
        {subtitles.map((subtitle, index) => (
          <div key={index} className="flex items-center mb-2">
            <input
              type="text"
              value={subtitle}
              onChange={(e) => updateSubtitle(index, e.target.value)}
              className="flex-grow p-2 border rounded"
              placeholder={t('subtitlePlaceholder', { number: index + 1 })}
            />
            <button onClick={() => removeSubtitle(index)} className="ml-2 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
              {t('delete')}
            </button>
          </div>
        ))}
        <button onClick={addSubtitle} className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
          {t('addSubtitle')}
        </button>

        <h2 className="text-2xl font-bold mt-6 mb-4">{t('subtitleSettings')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block mb-2">
              {t('subtitleHeight', { percent: subtitleHeightPercent })}
              {imageSize.height > 0 && t('pixelHeight', { pixels: Math.round(imageSize.height * subtitleHeightPercent / 100) })}
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={subtitleHeightPercent}
              onChange={(e) => setSubtitleHeightPercent(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block mb-2">
              {t('fontSize', { percent: fontSizePercent })}
              {imageSize.height > 0 && t('pixelFontSize', { pixels: Math.round(imageSize.height * subtitleHeightPercent / 100 * fontSizePercent / 100) })}
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={fontSizePercent}
              onChange={(e) => setFontSizePercent(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block mb-2">{t('fontColor')}</label>
            <input
              type="color"
              value={fontColor}
              onChange={(e) => setFontColor(e.target.value)}
              className="w-full h-10 cursor-pointer"
            />
          </div>

          <div>
            <label className="block mb-2">{t('fontType')}</label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value='"Microsoft YaHei", "微软雅黑", sans-serif'>{t('microsoftYahei')}</option>
              <option value='"SimSun", "宋体", serif'>{t('simsun')}</option>
              <option value='"SimHei", "黑体", sans-serif'>{t('simhei')}</option>
              <option value='"KaiTi", "楷体", cursive'>{t('kaiti')}</option>
              <option value='"FangSong", "仿宋", serif'>{t('fangsong')}</option>
              <option value='Arial, sans-serif'>Arial</option>
              <option value='Monaco, monospace'>Monaco</option>
              <option value='Helvetica, sans-serif'>Helvetica</option>
              <option value='"Times New Roman", Times, serif'>Times New Roman</option>
              <option value='"Comic Sans MS", cursive'>Comic Sans MS</option>
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={textShadow}
                onChange={(e) => setTextShadow(e.target.checked)}
                className="mr-2"
              />
              <span>{t('textShadow')}</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={textStroke}
                onChange={(e) => setTextStroke(e.target.checked)}
                className="mr-2"
              />
              <span>{t('textStroke')}</span>
            </label>
          </div>

          <div>
            <label className="block mb-2">{t('backgroundColor')}</label>
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="w-full h-10 cursor-pointer"
            />
          </div>

          <div>
            <label className="block mb-2">{t('backgroundOpacity', { opacity: backgroundOpacity.toFixed(2) })}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={backgroundOpacity}
              onChange={(e) => setBackgroundOpacity(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={useGradient}
                onChange={(e) => setUseGradient(e.target.checked)}
                className="mr-2"
              />
              <span>{t('useGradientBackground')}</span>
            </label>
          </div>

          {useGradient && (
            <div>
              <label className="block mb-2">{t('gradientEndColor')}</label>
              <input
                type="color"
                value={gradientColor}
                onChange={(e) => setGradientColor(e.target.value)}
                className="w-full h-10 cursor-pointer"
              />
            </div>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
};

export default ImageSubtitleTool;