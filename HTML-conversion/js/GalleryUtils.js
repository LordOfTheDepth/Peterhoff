// GalleryUtils.js
(function() {
    'use strict';
    
    const GalleryUtils = {
        
        // Экранирование HTML для текста
        escapeHtml: function(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },
        
        // Экранирование HTML для атрибутов
        escapeHtmlAttribute: function(url) {
            if (!url) return '';
            return String(url)
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        },
        
        // Декодирование base64 с учетом UTF-8
        decodeBase64UTF8: function(base64) {
            try {
                // Преобразуем base64 в бинарные данные
                const binaryString = atob(base64);
                
                // Преобразуем бинарную строку в массив байт
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                
                // Декодируем как UTF-8
                return new TextDecoder('utf-8').decode(bytes);
            } catch (error) {
                console.error('Ошибка декодирования base64:', error);
                return '';
            }
        },
        
        // Натуральная сортировка (для названий файлов)
        naturalCompare: function(str1, str2) {
            const nameA = str1.toLowerCase();
            const nameB = str2.toLowerCase();
            
            const regex = /(\d+)|(\D+)/g;
            const parts1 = nameA.match(regex) || [];
            const parts2 = nameB.match(regex) || [];
            
            for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
                const part1 = parts1[i];
                const part2 = parts2[i];
                
                // Если обе части - числа, сравниваем как числа
                const isNum1 = /^\d+$/.test(part1);
                const isNum2 = /^\d+$/.test(part2);
                
                if (isNum1 && isNum2) {
                    const num1 = parseInt(part1, 10);
                    const num2 = parseInt(part2, 10);
                    if (num1 !== num2) {
                        return num1 - num2;
                    }
                } else {
                    // Иначе сравниваем как строки
                    const compareResult = part1.localeCompare(part2, 'ru', { 
                        sensitivity: 'base',
                        numeric: true 
                    });
                    if (compareResult !== 0) {
                        return compareResult;
                    }
                }
            }
            
            // Если все части совпадают до определенной длины, более короткая строка идет первой
            return parts1.length - parts2.length;
        },
        
        // Создание уникального UUID на основе имени файла
        createFileUUID: function(fileName) {
            return btoa(encodeURIComponent(fileName)).substring(0, 20);
        },
        
        // Форматирование имени файла для отображения (удаление расширения)
        formatDisplayTitle: function(fileName) {
            return fileName.replace(/\.[^.]+$/, "");
        },
        
        // Инициализация Fancybox
        initFancybox: function(selector, options = {}) {
            if (typeof Fancybox === 'undefined') {
                console.warn('Fancybox не загружен');
                return;
            }
            
            const defaultOptions = {
                Thumbs: { autoStart: false }
            };
            
            const items = document.querySelectorAll(selector);
            if (items.length > 0) {
                Fancybox.bind(items, { ...defaultOptions, ...options });
            }
        }
    };
    
    // Экспорт для использования извне
    window.GalleryUtils = GalleryUtils;
    
})();