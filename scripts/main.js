        /**
         * TERRA PRO IDE 4.0 - ULTRA FUSION
         * The Ultimate Web Development Environment
         */
         
  

        class CodeFormatter {
          constructor() {
            this.formattersLoaded = false;
            this.loadingPromise = null;
            this.CDN_SOURCES = [
              'https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.7/beautify.min.js',
              'https://unpkg.com/js-beautify@1.14.7/js/lib/beautify.min.js',
              'https://cdn.jsdelivr.net/npm/js-beautify@1.14.7/js/lib/beautify.min.js'
            ];
          }

          async loadFormatters() {
            if (this.formattersLoaded) return true;

            if (this.loadingPromise) {
              return this.loadingPromise;
            }

            this.loadingPromise = new Promise(async (resolve, reject) => {
              // Check if already loaded (maybe from other script)
              if (typeof js_beautify !== 'undefined' &&
                typeof css_beautify !== 'undefined' &&
                typeof html_beautify !== 'undefined') {
                this.formattersLoaded = true;
                console.log('✅ Formatters already loaded');
                resolve(true);
                return;
              }

              console.log('📦 Loading code formatters...');

              // Try multiple CDNs
              for (let i = 0; i < this.CDN_SOURCES.length; i++) {
                try {
                  await this.loadScript(this.CDN_SOURCES[i]);
                  this.formattersLoaded = true;
                  console.log(`✅ Formatters loaded from: ${this.CDN_SOURCES[i]}`);
                  resolve(true);
                  return;
                } catch (error) {
                  console.warn(`❌ CDN ${i + 1} failed: ${error.message}`);
                  if (i === this.CDN_SOURCES.length - 1) {
                    console.log('🔄 Using fallback formatters');
                    resolve(false); // Not error, just use fallback
                  }
                }
              }
            });

            return this.loadingPromise;
          }

          loadScript(src) {
            return new Promise((resolve, reject) => {
              // Check if already loaded
              if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
              }

              const script = document.createElement('script');
              script.src = src;
              script.crossOrigin = 'anonymous';
              script.async = true;

              script.onload = () => {
                // Verify libraries are loaded
                setTimeout(() => {
                  if (typeof js_beautify !== 'undefined') {
                    resolve();
                  } else {
                    reject(new Error('Library not available after loading'));
                  }
                }, 100);
              };

              script.onerror = () => reject(new Error(`Failed to load: ${src}`));

              // Timeout
              setTimeout(() => reject(new Error('Load timeout')), 10000);

              document.head.appendChild(script);
            });
          }

          async formatCode(code, fileType, options = {}) {
            try {
              // Try to load formatters first
              const loaded = await this.loadFormatters();

              let formatted = code;
              let method = 'none';

              // Use library if available
              if (loaded && typeof js_beautify !== 'undefined') {
                formatted = this.formatWithLibrary(code, fileType, options);
                method = 'js-beautify';
              } else {
                // Fallback to custom formatter
                formatted = this.formatWithFallback(code, fileType, options);
                method = 'fallback';
              }

              return {
                code: formatted,
                method: method,
                changed: formatted !== code
              };

            } catch (error) {
              console.error('Formatter error:', error);
              // Ultimate fallback - return original
              return {
                code: code,
                method: 'error',
                changed: false,
                error: error.message
              };
            }
          }

          formatWithLibrary(code, fileType, userOptions) {
            const defaultOptions = {
              indent_size: 2,
              indent_char: ' ',
              indent_with_tabs: false,
              end_with_newline: false,
              preserve_newlines: true,
              max_preserve_newlines: 10
            };

            const options = {
              ...defaultOptions,
              ...userOptions
            };

            switch (fileType.toLowerCase()) {
              case 'js':
              case 'javascript':
                return js_beautify(code, {
                  ...options,
                  brace_style: 'collapse',
                  space_before_conditional: true,
                  unescape_strings: false,
                  jslint_happy: false,
                  wrap_line_length: 0
                });

              case 'css':
                return css_beautify(code, {
                  ...options,
                  selector_separator_newline: true,
                  newline_between_rules: true,
                  space_around_combinator: true
                });

              case 'html':
              case 'htm':
                return html_beautify(code, {
                  ...options,
                  indent_inner_html: true,
                  brace_style: 'collapse',
                  indent_scripts: 'keep',
                  wrap_attributes: 'auto',
                  wrap_attributes_indent_size: 2,
                  extra_liners: ['head', 'body', '/html']
                });

              case 'json':
                try {
                  const parsed = JSON.parse(code);
                  return JSON.stringify(parsed, null, options.indent_size);
                } catch {
                  return code;
                }

              default:
                return code;
            }
          }

          formatWithFallback(code, fileType, options) {
            const indentSize = options?.indent_size || 2;
            const indentChar = ' '.repeat(indentSize);

            switch (fileType.toLowerCase()) {
              case 'js':
              case 'javascript':
                return this.formatJavaScript(code, indentChar);

              case 'css':
                return this.formatCSS(code, indentChar);

              case 'html':
              case 'htm':
                return this.formatHTML(code, indentChar);

              case 'json':
                return this.formatJSON(code, indentChar);

              case 'md':
              case 'markdown':
                return this.formatMarkdown(code);

              default:
                return this.formatGeneric(code, indentChar);
            }
          }

          // ========== FALLBACK FORMATTERS ==========

          formatJavaScript(code, indentChar) {
            // Smart JS formatter with AST if available
            if (typeof esprima !== 'undefined') {
              try {
                return this.formatJavaScriptWithAST(code, indentChar);
              } catch {
                // Fall through to basic formatter
              }
            }

            // Basic JS formatter
            return code
              .replace(/([;{}])(?!\s|$)/g, '$1\n') // Newline after ; { }
              .replace(/\s*([=+\-*/%&|^~!<>?:])\s*/g, ' $1 ') // Space around operators
              .replace(/([\[({])\s+/g, '$1') // Remove space after ([{
              .replace(/\s+([\])}])/g, '$1') // Remove space before ])}
              .replace(/,\s*/g, ', ') // Space after comma
              .replace(/(\b(?:function|if|for|while|switch|try|catch)\b)/g, '\n$1') // Newline before keywords
              .replace(/}\s*(else|catch|finally)\b/g, '} $1') // Space before else/catch/finally
              .replace(/\n\s*\n/g, '\n') // Remove multiple newlines
              .split('\n')
              .map(line => line.trim() ? indentChar + line.trim() : '')
              .join('\n')
              .trim();
          }

          formatJavaScriptWithAST(code, indentChar) {
            // Advanced formatting with Esprima
            const ast = esprima.parseScript(code, {
              tokens: true,
              comment: true,
              range: true
            });

            let result = '';
            let indent = 0;
            let lastPos = 0;

            ast.tokens.forEach((token, index) => {
              const [start, end] = token.range;

              // Add whitespace before token
              const whitespace = code.substring(lastPos, start);

              // Handle indentation
              if (token.value === '}') indent = Math.max(0, indent - 1);

              result += whitespace;
              result += indentChar.repeat(indent) + token.value;

              if (token.value === '{') indent++;

              lastPos = end;
            });

            // Add remaining code
            result += code.substring(lastPos);

            return result;
          }

          formatCSS(code, indentChar) {
            let result = '';
            let indent = 0;
            let inComment = false;
            let inRule = false;

            const lines = code.replace(/\r\n/g, '\n').split('\n');

            lines.forEach(line => {
              const trimmed = line.trim();

              if (!trimmed) return;

              // Handle comments
              if (trimmed.startsWith('/*')) {
                if (!trimmed.endsWith('*/')) inComment = true;
                result += indentChar.repeat(indent) + trimmed + '\n';
                return;
              }
              if (inComment) {
                result += indentChar.repeat(indent) + trimmed + '\n';
                if (trimmed.endsWith('*/')) inComment = false;
                return;
              }

              // Handle rules
              if (trimmed.endsWith('{') && !trimmed.includes('@')) {
                result += indentChar.repeat(indent) + trimmed + '\n';
                indent++;
                inRule = true;
              } else if (trimmed === '}') {
                indent = Math.max(0, indent - 1);
                result += indentChar.repeat(indent) + trimmed + '\n';
                inRule = false;
              } else if (inRule && trimmed.includes(':')) {
                // Property line
                result += indentChar.repeat(indent) + trimmed;
                if (!trimmed.endsWith(';')) result += ';';
                result += '\n';
              } else {
                // Other lines (media queries, imports, etc)
                result += indentChar.repeat(indent) + trimmed + '\n';
              }
            });

            return result.trim();
          }

          formatHTML(code, indentChar) {
            // Smart HTML formatter with tag awareness
            let result = '';
            let indent = 0;
            let inTag = false;
            let tagBuffer = '';
            let inPre = false;
            let inScript = false;
            let inStyle = false;
            let inComment = false;

            // Process character by character for better control
            for (let i = 0; i < code.length; i++) {
              const char = code[i];
              const nextChar = code[i + 1];

              // Handle comments
              if (char === '<' && nextChar === '!') {
                if (code.substring(i, i + 4) === '<!--') {
                  inComment = true;
                  result += '\n' + indentChar.repeat(indent) + '<!--';
                  i += 3;
                  continue;
                }
              }
              if (inComment) {
                result += char;
                if (char === '>' && code[i - 1] === '-' && code[i - 2] === '-') {
                  inComment = false;
                  result += '\n';
                }
                continue;
              }

              // Handle <pre>, <script>, <style> content
              if (char === '<') {
                const tagMatch = code.substring(i).match(/^<(\/?)(pre|script|style|textarea)/i);
                if (tagMatch) {
                  if (tagMatch[1]) {
                    // Closing tag
                    inPre = false;
                    inScript = false;
                    inStyle = false;
                  } else {
                    // Opening tag
                    if (tagMatch[2].toLowerCase() === 'pre') inPre = true;
                    if (tagMatch[2].toLowerCase() === 'script') inScript = true;
                    if (tagMatch[2].toLowerCase() === 'style') inStyle = true;
                  }
                }
              }

              // Skip formatting inside pre, script, style
              if (inPre || inScript || inStyle) {
                result += char;
                continue;
              }

              // Handle tags
              if (char === '<') {
                inTag = true;
                tagBuffer = '<';
              } else if (char === '>') {
                inTag = false;
                tagBuffer += '>';

                // Process the complete tag
                const tag = tagBuffer;
                const isClosing = tag.startsWith('</');
                const isSelfClosing = tag.endsWith('/>');
                const isDoctype = tag.startsWith('<!');
                const isComment = tag.startsWith('<!--');

                if (isClosing) {
                  indent = Math.max(0, indent - 1);
                  result += '\n' + indentChar.repeat(indent) + tag;
                } else if (isSelfClosing || isDoctype || tag.match(/^<(meta|link|img|br|hr|input)/i)) {
                  result += '\n' + indentChar.repeat(indent) + tag;
                } else if (!isComment) {
                  result += '\n' + indentChar.repeat(indent) + tag;
                  if (!tag.match(/<(script|style|pre|textarea)/i)) {
                    indent++;
                  }
                } else {
                  result += '\n' + indentChar.repeat(indent) + tag;
                }

                tagBuffer = '';
              } else if (inTag) {
                tagBuffer += char;
              } else if (char.trim() !== '') {
                // Text content
                if (result.endsWith('>')) {
                  result += '\n' + indentChar.repeat(indent);
                }
                result += char;
              }
            }

            // Handle any remaining tag buffer
            if (tagBuffer) {
              result += '\n' + indentChar.repeat(indent) + tagBuffer;
            }

            return result.trim();
          }

          formatJSON(code, indentChar) {
            try {
              const parsed = JSON.parse(code);
              const indentSize = indentChar.length;
              return JSON.stringify(parsed, null, indentSize);
            } catch (error) {
              // Try to fix common JSON issues
              const fixed = code
                .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3') // Add quotes to keys
                .replace(/,\s*}/g, '}') // Remove trailing commas
                .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays

              try {
                const parsed = JSON.parse(fixed);
                const indentSize = indentChar.length;
                return JSON.stringify(parsed, null, indentSize);
              } catch {
                return code; // Give up
              }
            }
          }

          formatMarkdown(code) {
            // Basic Markdown cleanup
            return code
              .replace(/^#\s*(.*)$/gm, '# $1') // Headers
              .replace(/^##\s*(.*)$/gm, '## $1')
              .replace(/^###\s*(.*)$/gm, '### $1')
              .replace(/\*\*(.*?)\*\*/g, '**$1**') // Bold
              .replace(/\*(.*?)\*/g, '*$1*') // Italic
              .replace(/`(.*?)`/g, '`$1`') // Inline code
              .replace(/\[(.*?)\]\((.*?)\)/g, '[$1]($2)') // Links
              .replace(/\n{3,}/g, '\n\n') // Remove extra newlines
              .replace(/^\s*[-*+]\s+(.*)$/gm, '* $1') // Normalize list markers
              .trim();
          }

          formatGeneric(code, indentChar) {
            // Generic formatter for unknown file types
            return code
              .split('\n')
              .map((line, index) => {
                const trimmed = line.trim();
                if (!trimmed) return '';

                // Try to detect indentation
                const leadingSpaces = line.match(/^(\s*)/)[0].length;
                const indentLevel = Math.floor(leadingSpaces / 2);

                return indentChar.repeat(indentLevel) + trimmed;
              })
              .filter(line => line !== '')
              .join('\n');
          }
        }

        // Global formatter instance
        const globalFormatter = new CodeFormatter();

        /**
         * 🔐 ROBUST OBFUSCATOR ENGINE
         * Multi-CDN Fallback dengan Advanced Transformations
         */
        class RobustObfuscator {
          constructor() {
            this.CDN_SOURCES = [
              'https://cdn.jsdelivr.net/npm/javascript-obfuscator@4.0.0/dist/index.browser.js',
              'https://unpkg.com/javascript-obfuscator@4.0.0/dist/index.browser.js',
              'https://cdnjs.cloudflare.com/ajax/libs/javascript-obfuscator/4.0.0/index.browser.js'
            ];
            this.currentSourceIndex = 0;
            this.isLoaded = false;
            this.loadingPromise = null;
          }

          // Try multiple CDNs dengan retry logic
          async loadFromCDN(sourceIndex = 0) {
            if (this.isLoaded) return true;

            if (this.loadingPromise) {
              return this.loadingPromise;
            }

            this.loadingPromise = new Promise(async (resolve, reject) => {
              if (sourceIndex >= this.CDN_SOURCES.length) {
                reject(new Error('All CDN sources failed'));
                this.loadingPromise = null;
                return;
              }

              const source = this.CDN_SOURCES[sourceIndex];
              console.log(`🔄 Loading obfuscator from: ${source}`);

              try {
                await this.loadScript(source);
                this.isLoaded = true;
                this.currentSourceIndex = sourceIndex;
                console.log('✅ Obfuscator loaded successfully');
                resolve(true);
              } catch (error) {
                console.warn(`❌ CDN ${sourceIndex + 1} failed: ${error.message}`);

                // Clean up failed script
                const failedScript = document.querySelector(`script[src="${source}"]`);
                if (failedScript) failedScript.remove();

                // Try next CDN
                setTimeout(() => {
                  this.loadFromCDN(sourceIndex + 1)
                    .then(resolve)
                    .catch(reject);
                }, 500);
              }
            });

            return this.loadingPromise;
          }

          loadScript(src) {
            return new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = src;
              script.crossOrigin = 'anonymous';
              script.async = true;

              script.onload = () => {
                // Verify library is actually loaded
                if (typeof JavaScriptObfuscator !== 'undefined') {
                  resolve();
                } else {
                  reject(new Error('Library loaded but global object not found'));
                }
              };

              script.onerror = () => reject(new Error(`Failed to load script: ${src}`));

              // Timeout after 10 seconds
              setTimeout(() => reject(new Error('Load timeout')), 10000);

              document.head.appendChild(script);
            });
          }

          async obfuscate(code, userOptions = {}) {
            try {
              // Load library if not loaded
              if (!this.isLoaded) {
                console.log('📦 Loading obfuscation engine...');
                await this.loadFromCDN();
              }

              // Validate code
              if (!code || typeof code !== 'string' || code.trim().length === 0) {
                throw new Error('Invalid code: empty or not a string');
              }

              // Professional obfuscation options
              const options = {
                // Core protection
                compact: true,
                controlFlowFlattening: true,
                controlFlowFlatteningThreshold: 0.75,
                deadCodeInjection: true,
                deadCodeInjectionThreshold: 0.4,

                // String protection
                stringArray: true,
                stringArrayEncoding: ['rc4', 'base64'],
                stringArrayThreshold: 0.75,
                stringArrayIndexShift: true,
                stringArrayWrappersCount: 2,
                stringArrayWrappersChainedCalls: true,
                stringArrayWrappersParametersMaxCount: 4,
                stringArrayWrappersType: 'function',

                // Identifier protection
                identifierNamesGenerator: 'hexadecimal',
                identifiersPrefix: '',
                renameGlobals: false,

                // Transformation
                transformObjectKeys: true,
                numbersToExpressions: true,
                simplify: true,

                // Self-defense
                selfDefending: true,
                debugProtection: false, // Set true for production
                debugProtectionInterval: 4000,

                // Output
                disableConsoleOutput: true,
                log: false,
                sourceMap: false,
                sourceMapMode: 'separate',

                // Domain lock (optional)
                domainLock: [],

                // Performance
                target: 'browser',

                // Merge user options
                ...userOptions
              };

              console.log('⚙️ Obfuscating with professional engine...');
              const result = JavaScriptObfuscator.obfuscate(code, options);

              return {
                code: result.getObfuscatedCode(),
                sourceMap: result.getSourceMap(),
                options: result.getOptions()
              };

            } catch (error) {
              console.error('❌ Professional obfuscation failed:', error);

              // Enhanced fallback
              console.log('🔄 Falling back to enhanced transformer...');
              return {
                code: this.enhancedFallback(code),
                sourceMap: null,
                options: {
                  fallback: true
                }
              };
            }
          }

          // Enhanced fallback dengan lebih banyak teknik
          enhancedFallback(code) {
            try {
              const transformer = new CodeTransformer();
              return transformer.transform(code);
            } catch (error) {
              console.error('Fallback transformation failed:', error);

              // Ultimate fallback - simple encoding
              return this.simpleEncode(code);
            }
          }

          simpleEncode(code) {
            // Basic encoding when everything else fails
            return `(function(){'use strict';${this.basicObfuscate(code)}}).call(this);`;
          }

          basicObfuscate(code) {
            // Remove comments and whitespace
            let result = code
              .replace(/\/\/.*$/gm, '')
              .replace(/\/\*[\s\S]*?\*\//g, '')
              .replace(/\s+/g, ' ')
              .trim();

            // Simple variable renaming
            const vars = new Set();
            const varRegex = /\b(var|let|const)\s+([a-zA-Z_$][\w$]*)/g;
            let match;

            while ((match = varRegex.exec(result)) !== null) {
              vars.add(match[2]);
            }

            // Simple name mangling
            let counter = 0;
            vars.forEach(varName => {
              if (varName.length > 2) {
                const newName = '_' + (counter++).toString(36);
                const regex = new RegExp(`\\b${varName}\\b`, 'g');
                result = result.replace(regex, newName);
              }
            });

            return result;
          }
        }

        // Advanced fallback transformer
        class CodeTransformer {
          constructor() {
            this.variableMap = new Map();
            this.stringCache = new Map();
            this.functionMap = new Map();
            this.stringArray = [];
            this.stringArrayName = '_' + Math.random().toString(36).substr(2, 8);
          }

          transform(code) {
            console.log('🛠️ Transforming code with enhanced fallback...');

            // Phase 0: Pre-process
            code = this.preprocess(code);

            // Phase 1: String obfuscation
            code = this.obfuscateStrings(code);

            // Phase 2: Variable mangling
            code = this.mangleVariables(code);

            // Phase 3: Function wrapping
            code = this.wrapFunctions(code);

            // Phase 4: Add string array
            code = this.addStringArray(code);

            // Phase 5: Add junk code
            code = this.addJunkCode(code);

            // Phase 6: Final encoding
            code = this.finalEncode(code);

            return code;
          }

          preprocess(code) {
            // Remove comments
            return code
              .replace(/\/\/.*$/gm, '')
              .replace(/\/\*[\s\S]*?\*\//g, '')
              .replace(/\r\n/g, '\n')
              .trim();
          }

          obfuscateStrings(code) {
            console.log('📝 Obfuscating strings...');

            const stringRegex = /(["'`])(?:(?=(\\?))\2.)*?\1/g;

            return code.replace(stringRegex, (match) => {
              if (match.length < 3) return match;

              const quote = match[0];
              const content = match.substring(1, match.length - 1);

              // Skip if content is very short
              if (content.length < 2) return match;

              const cacheKey = content;

              if (this.stringCache.has(cacheKey)) {
                return this.stringCache.get(cacheKey);
              }

              // Add to string array
              const index = this.stringArray.length;
              this.stringArray.push(content);

              // Create array access
              const encoded = `${this.stringArrayName}[${index}]`;
              this.stringCache.set(cacheKey, encoded);

              return encoded;
            });
          }

          mangleVariables(code) {
            console.log('🔡 Mangling variables...');

            // Find all variable declarations
            const varRegex = /\b(var|let|const)\s+([a-zA-Z_$][\w$]*)(?:\s*=[^,;]*)?/g;
            const vars = [];

            let match;
            while ((match = varRegex.exec(code)) !== null) {
              const varName = match[2];

              // Skip common names and short names
              if (varName.length < 3 || ['i', 'j', 'k', 'x', 'y', 'z', 'n', 't', 'e'].includes(varName) || ['console', 'window', 'document', 'alert', 'fetch'].includes(varName)) {
                continue;
              }

              if (!this.variableMap.has(varName)) {
                const newName = '_0x' + Math.random().toString(16).substr(2, 6);
                this.variableMap.set(varName, newName);
                vars.push({
                  old: varName,
                  new: newName
                });
              }
            }

            // Replace all occurrences (carefully, avoiding property names)
            vars.forEach(({
              old,
              new: newName
            }) => {
              // Replace standalone identifiers, not property accesses
              const regex = new RegExp(`\\b${old}\\b(?![\\w$])`, 'g');
              code = code.replace(regex, newName);
            });

            return code;
          }

          wrapFunctions(code) {
            console.log('📦 Wrapping functions...');

            // Create wrapper with anti-debug
            const wrapper = `
(function(){
    'use strict';
    
    // Anti-debugging
    var startTime = Date.now();
    var debugCheck = function(){
        var endTime = Date.now();
        if (endTime - startTime > 1000) {
            console.error('Debugger detected');
            return false;
        }
        return true;
    };
    
    if (!debugCheck()) return;
    
    // Actual code
    ${code}
    
    // Final check
    debugCheck();
}).call(this);
        `;

            return wrapper.trim();
          }

          addStringArray(code) {
            if (this.stringArray.length === 0) return code;

            console.log('🗃️ Adding string array...');

            // Encode strings in array
            const encodedStrings = this.stringArray.map(str => {
              // Simple XOR encoding
              let encoded = '';
              for (let i = 0; i < str.length; i++) {
                encoded += String.fromCharCode(str.charCodeAt(i) ^ 0x42);
              }
              return btoa(encoded);
            });

            // Create decoder function
            const arrayDeclaration = `
var ${this.stringArrayName} = ${JSON.stringify(encodedStrings)};
${this.stringArrayName} = ${this.stringArrayName}.map(function(s){
    var decoded = atob(s);
    var result = '';
    for(var i=0;i<decoded.length;i++){
        result += String.fromCharCode(decoded.charCodeAt(i) ^ 0x42);
    }
    return result;
});
        `;

            return arrayDeclaration + code;
          }

          addJunkCode(code) {
            console.log('🗑️ Adding junk code...');

            const junkId = Math.random().toString(36).substr(2, 4);

            const junkBefore = [
              `/* Obfuscated by Terra Pro IDE */`,
              `var _junk${junkId} = function(){ return ${Math.random()}; };`,
              `try{ if(typeof window!=='undefined'){ window._ = window._ || {}; } }catch(e){}`,
              `!function(){var d=new Date();var _t=d.getTime();}();`
            ].join('\n');

            const junkAfter = [
              `/* Protection complete ${new Date().toISOString().split('T')[0]} */`,
              `typeof console!=='undefined'&&console.log('Code protected');`,
              `var _end${junkId}=function(){return !0;};`
            ].join('\n');

            return junkBefore + '\n' + code + '\n' + junkAfter;
          }

          finalEncode(code) {
            console.log('🎯 Final encoding...');

            // Minify
            let result = code
              .replace(/\s+/g, ' ')
              .replace(/\s*([{}();,=+-\/*<>!&|])\s*/g, '$1')
              .replace(/;+/g, ';')
              .trim();

            // Add random line breaks to confuse
            const lines = result.split(';');
            if (lines.length > 10) {
              result = lines.join(';\\\n');
            }

            return result;
          }
        }

        // Global obfuscator instance
        const globalObfuscator = new RobustObfuscator();

        // ==================== 11.1. CORE APPLICATION OBJECT ====================
        const IDE = {
          // 11.1.1 State Management
          state: {
            currentFile: null,
            openFiles: [],
            modifiedFiles: new Set(),
            fileTree: [],
            assets: [],
            astRules: {
              noEval: true,
              noVar: true,
              strictMode: true,
              noWith: true
            },
            uscating: false,
            previewSize: 'desktop',
            activePanel: 'console'
          },

          // 11.1.2 Database Instance
          db: new Dexie('TerraIDE4'),

          // 11.1.3 Editor Instance
          editor: null,

          // 11.1.4 Cache
          cache: {
            assetUrls: new Map(),
            fileContent: new Map(),
            astCache: new Map()
          },

          obfuscator: globalObfuscator,
          isObfuscating: false,
          formatter: globalFormatter,

          // ==================== 11.2. INITIALIZATION ====================
          async init() {
            try {
              // 11.2.1 Setup Database
              this.setupDatabase();

              // 11.2.2 Initialize Editor
              this.initEditor();

              // 11.2.3 Load Default Project
              await this.loadDefaultProject();

              // 11.2.4 Setup Event Listeners
              this.setupEventListeners();

              // 11.2.5 Render UI
              await this.renderFileTree();
              this.renderAssets();

              // 11.2.6 Show Welcome Message
              this.showToast('Terra Pro IDE 4.0 Ready', 'Ultra Fusion Edition loaded successfully', 'success');
              this.logToConsole('System initialized successfully', 'info');

            } catch (error) {
              console.error('Initialization failed:', error);
              this.showToast('Initialization Failed', error.message, 'error');
            }
          },

          // ==================== 11.3. DATABASE MANAGEMENT ====================
          setupDatabase() {
            this.db.version(1).stores({
              files: 'id, path, name, type, parent, content, createdAt, updatedAt',
              assets: 'id, name, type, data, size, createdAt',
              settings: 'key, value'
            });

            // Enable debugging
            this.db.on('ready', () => {
              this.logToConsole('Database ready', 'info');
            });
          },

          // ==================== 11.4. EDITOR ENGINE ====================
          initEditor() {
            // 11.4.1 Initialize Ace Editor
            this.editor = ace.edit('ace-editor');

            // 11.4.2 Configure Editor
            this.editor.setTheme('ace/theme/twilight');
            this.editor.session.setMode('ace/mode/javascript');
            this.editor.setOptions({
              enableBasicAutocompletion: true,
              enableLiveAutocompletion: true,
              enableSnippets: true,
              fontSize: '14px',
              fontFamily: "'Fira Code', monospace",
              showPrintMargin: false,
              highlightActiveLine: true,
              highlightSelectedWord: true,
              showLineNumbers: true,
              showGutter: true,
              tabSize: 2,
              useSoftTabs: true,
              wrap: true,
              behavioursEnabled: true,
              animatedScroll: true,
              scrollSpeed: 2,
              fadeFoldWidgets: true
            });

            // 11.4.3 Custom Theme Injection
            this.injectCustomTheme();

            // 11.4.4 Setup Language Tools
            ace.require('ace/ext/language_tools');

            // 11.4.5 Setup Event Handlers
            this.setupEditorEvents();
          },

          injectCustomTheme() {
            const theme = `
                .ace-terra-pro .ace_gutter {
                    background: #161925;
                    color: #94a3b8;
                }
                .ace-terra-pro {
                    background-color: #0f111a;
                    color: #e2e8f0;
                }
                .ace-terra-pro .ace_cursor {
                    color: #7c3aed;
                }
                .ace-terra-pro .ace_marker-layer .ace_selection {
                    background: rgba(124, 58, 237, 0.3);
                }
                .ace-terra-pro .ace_keyword {
                    color: #8b5cf6;
                }
                .ace-terra-pro .ace_string {
                    color: #10b981;
                }
                .ace-terra-pro .ace_comment {
                    color: #64748b;
                    font-style: italic;
                }
                `;

            const style = document.createElement('style');
            style.textContent = theme;
            document.head.appendChild(style);

            this.editor.setTheme('ace/theme/twilight'); // Fallback
          },

          setupEditorEvents() {
            // Auto-save with debounce
            let saveTimer;
            this.editor.on('change', () => {
              if (this.state.currentFile) {
                this.state.modifiedFiles.add(this.state.currentFile);
                this.updateTabStatus();

                clearTimeout(saveTimer);
                saveTimer = setTimeout(() => {
                  this.autoSave();
                }, 1000);
              }

              // Update status bar position
              this.updateStatusBar();
            });

            // Cursor position tracking
            this.editor.selection.on('changeCursor', () => {
              this.updateStatusBar();
            });

            // Keyboard shortcuts
            this.editor.commands.addCommand({
              name: 'saveFile',
              bindKey: {
                win: 'Ctrl-S',
                mac: 'Command-S'
              },
              exec: () => this.saveFile()
            });

            this.editor.commands.addCommand({
              name: 'runPreview',
              bindKey: {
                win: 'F5',
                mac: 'F5'
              },
              exec: () => this.runPreview()
            });

            this.editor.commands.addCommand({
              name: 'beautifyCode',
              bindKey: {
                win: 'Ctrl-Shift-F',
                mac: 'Command-Shift-F'
              },
              exec: () => this.beautifyCode()
            });
          },

          // ==================== 11.5. FILE MANAGEMENT ====================
          async loadDefaultProject() {
            const count = await this.db.files.count();

            if (count === 0) {
              const defaultFiles = [{
                  id: 'index.html',
                  path: '/index.html',
                  name: 'index.html',
                  type: 'file',
                  parent: '/',
                  content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terra Pro IDE 4.0</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>Terra Pro IDE 4.0</h1>
        <p class="subtitle">Ultra Fusion Edition</p>
        <div id="output"></div>
        <button id="demo-btn" onclick="showMessage()">Click Me!</button>
        <div id="result"></div>
    </div>
    <script src="script.js"><\/script>
<\/body>
<\/html>`,
                  createdAt: Date.now(),
                  updatedAt: Date.now()
                },
                {
                  id: 'style.css',
                  path: '/style.css',
                  name: 'style.css',
                  type: 'file',
                  parent: '/',
                  content: `/* Terra Pro IDE Default Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.container {
    background: white;
    padding: 40px;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    max-width: 600px;
    width: 100%;
    text-align: center;
}

h1 {
    color: #333;
    margin-bottom: 10px;
    font-size: 2.5em;
}

.subtitle {
    color: #7c3aed;
    margin-bottom: 30px;
    font-weight: 500;
}

#output {
    background: #f5f5f5;
    padding: 20px;
    border-radius: 10px;
    margin: 20px 0;
    border-left: 4px solid #7c3aed;
}

button {
    background: #7c3aed;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
    transition: transform 0.2s, background 0.2s;
}

button:hover {
    background: #5b21b6;
    transform: translateY(-2px);
}

#result {
    margin-top: 20px;
    padding: 15px;
    background: #e8f4fd;
    border-radius: 8px;
    color: #31708f;
    display: none;
}`,
                  createdAt: Date.now(),
                  updatedAt: Date.now()
                },
                {
                  id: 'script.js',
                  path: '/script.js',
                  name: 'script.js',
                  type: 'file',
                  parent: '/',
                  content: `// Terra Pro IDE Demo Script
console.log('Terra Pro IDE 4.0 - Ultra Fusion');

let clickCount = 0;
const maxClicks = 5;

function showMessage() {
    clickCount++;
    const output = document.getElementById('output');
    const result = document.getElementById('result');
    
    if (!output || !result) {
        console.error('Required elements not found');
        return;
    }
    
    output.innerHTML = \`<h3>Button clicked \${clickCount} times</h3>\`;
    
    if (clickCount >= maxClicks) {
        result.textContent = \`Maximum clicks (\${maxClicks}) reached!\`;
        result.style.display = 'block';
        result.style.background = '#ffebee';
        result.style.color = '#c62828';
        console.warn('Maximum clicks reached');
    } else {
        result.textContent = \`Keep going! \${maxClicks - clickCount} clicks remaining.\`;
        result.style.display = 'block';
        console.log(\`Button clicked: \${clickCount}\`);
    }
    
    // Example API call simulation
    simulateAPICall(clickCount);
}

async function simulateAPICall(id) {
    try {
        console.debug('Simulating API call for ID:', id);
        await new Promise(resolve => setTimeout(resolve, 100));
        console.info('API call successful');
    } catch (error) {
        console.error('API call failed:', error);
    }
}

// Array operations example
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log('Doubled numbers:', doubled);`,
                  createdAt: Date.now(),
                  updatedAt: Date.now()
                },
                {
                  id: 'assets-folder',
                  path: '/assets',
                  name: 'assets',
                  type: 'folder',
                  parent: '/',
                  content: '',
                  createdAt: Date.now(),
                  updatedAt: Date.now()
                }
              ];

              await this.db.files.bulkAdd(defaultFiles);
              this.logToConsole('Default project created', 'info');
            }
          },

          // Update renderFileTree() untuk render ke dua tempat
          async renderFileTree() {
            const trees = document.querySelectorAll('.file-tree');
            const files = await this.db.files.toArray();
            const treeData = this.buildFileTree(files);

            trees.forEach(tree => {
              tree.innerHTML = this.renderTreeLevel(treeData, 0);
            });

            // Attach events ke semua tree
            this.attachAllTreeEvents();
          },

          attachAllTreeEvents() {
            // Tree di modal
            this.attachTreeEventsToContainer(document.querySelector('.sidebar-modal .file-tree'));

            // Tree di tempat lain (jika ada)
            document.querySelectorAll('.file-tree:not(.sidebar-modal .file-tree)').forEach(tree => {
              this.attachTreeEventsToContainer(tree);
            });
          },

          buildFileTree(files) {
            const tree = {};
            const root = [];

            files.forEach(file => {
              if (!tree[file.path]) {
                tree[file.path] = {
                  ...file,
                  children: []
                };
              }
            });

            files.forEach(file => {
              if (file.parent === '/') {
                root.push(tree[file.path]);
              } else if (tree[file.parent]) {
                tree[file.parent].children.push(tree[file.path]);
              }
            });

            // Sort: folders first, then files
            const sortItems = (items) => {
              return items.sort((a, b) => {
                if (a.type === 'folder' && b.type !== 'folder') return -1;
                if (a.type !== 'folder' && b.type === 'folder') return 1;
                return a.name.localeCompare(b.name);
              });
            };

            const sortTree = (node) => {
              if (node.children) {
                node.children = sortItems(node.children);
                node.children.forEach(sortTree);
              }
              return node;
            };

            return sortItems(root.map(sortTree));
          },

          renderTreeLevel(items, level) {
            let html = '';
            const indent = level * 20;

            items.forEach(item => {
              const isFolder = item.type === 'folder';
              const isActive = this.state.currentFile === item.path;
              const icon = isFolder ? 'fa-folder' : this.getFileIcon(item.name);

              html += `
                    <div class="tree-item ${isActive ? 'active' : ''} ${isFolder ? 'folder' : ''}" 
                         data-path="${item.path}" 
                         data-type="${item.type}"
                         style="padding-left: ${indent + 20}px">
                        <i class="fas ${icon} icon"></i>
                        <span class="name">${item.name}</span>
                        <div class="actions">
                            <button class="btn-icon" onclick="IDE.deleteFile('${item.path}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    `;

              if (isFolder && item.children && item.children.length > 0) {
                html += this.renderTreeLevel(item.children, level + 1);
              }
            });

            return html;
          },

          getFileIcon(filename) {
            const ext = filename.split('.').pop().toLowerCase();
            const iconMap = {
              'html': 'fa-html5',
              'css': 'fa-css3-alt',
              'js': 'fa-js',
              'json': 'fa-code',
              'md': 'fa-markdown',
              'txt': 'fa-file-alt',
              'png': 'fa-file-image',
              'jpg': 'fa-file-image',
              'jpeg': 'fa-file-image',
              'gif': 'fa-file-image',
              'svg': 'fa-file-image'
            };
            return iconMap[ext] || 'fa-file';
          },

          attachTreeEvents() {
            document.querySelectorAll('.tree-item').forEach(item => {
              item.addEventListener('click', (e) => {
                if (e.target.closest('.actions')) return;

                const path = item.dataset.path;
                const type = item.dataset.type;

                if (type === 'folder') {
                  // Toggle folder (for future expansion)
                  item.classList.toggle('expanded');
                } else {
                  this.openFile(path);
                }
              });

              // Right-click context menu
              item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showContextMenu(e, item.dataset.path);
              });
            });
          },

          async openFile(path) {
            try {
              // Save current file if modified
              if (this.state.currentFile && this.state.modifiedFiles.has(this.state.currentFile)) {
                await this.saveFile();
              }

              // Load file from database
              const file = await this.db.files.get({
                path
              });

              if (!file) {
                throw new Error(`File not found: ${path}`);
              }

              // Update state
              this.state.currentFile = path;

              // Add to open files if not already
              if (!this.state.openFiles.includes(path)) {
                this.state.openFiles.push(path);
              }

              // Set editor content and mode
              this.editor.setValue(file.content || '', -1);
              this.setEditorMode(file.name);

              // Update UI
              this.renderTabs();
              this.updateFileTreeSelection();
              this.updateStatusBar();
              this.closeSidebarModal();

              this.logToConsole(`Opened: ${file.name}`, 'info');

            } catch (error) {
              this.showToast('Open File Failed', error.message, 'error');
            }
          },

          setEditorMode(filename) {
            const ext = filename.split('.').pop().toLowerCase();
            const modeMap = {
              'html': 'html',
              'css': 'css',
              'js': 'javascript',
              'json': 'json',
              'md': 'markdown',
              'py': 'python',
              'php': 'php',
              'java': 'java',
              'cpp': 'c_cpp',
              'c': 'c_cpp'
            };

            const mode = modeMap[ext] || 'text';
            this.editor.session.setMode(`ace/mode/${mode}`);

            // Update status bar
            document.getElementById('status-language').innerHTML =
              `<i class="fas fa-code"></i> <span>${mode.toUpperCase()}</span>`;
          },

          async saveFile() {
            if (!this.state.currentFile) {
              this.showToast('No File Open', 'Open a file to save', 'warning');
              return;
            }

            try {
              const content = this.editor.getValue();
              const file = await this.db.files.get({
                path: this.state.currentFile
              });

              if (file) {
                await this.db.files.update(file.id, {
                  content: content,
                  updatedAt: Date.now()
                });

                this.state.modifiedFiles.delete(this.state.currentFile);
                this.updateTabStatus();

                this.showToast('File Saved', `${file.name} saved successfully`, 'success');
                this.logToConsole(`Saved: ${file.name}`, 'info');
              }
            } catch (error) {
              this.showToast('Save Failed', error.message, 'error');
            }
          },

          autoSave() {
            if (this.state.currentFile && this.state.modifiedFiles.has(this.state.currentFile)) {
              this.saveFile();
            }
          },

          // ==================== 11.6. UI COMPONENTS ====================
          renderTabs() {
            const container = document.getElementById('tabs-container');
            container.innerHTML = '';

            this.state.openFiles.forEach(path => {
              const file = this.cache.fileContent.get(path) || {
                name: path.split('/').pop()
              };
              const isActive = path === this.state.currentFile;
              const isModified = this.state.modifiedFiles.has(path);

              const tab = document.createElement('div');
              tab.className = `tab ${isActive ? 'active' : ''} ${isModified ? 'modified' : ''}`;
              tab.dataset.path = path;

              tab.innerHTML = `
                        <span class="tab-name">${file.name}</span>
                        <span class="tab-close" onclick="IDE.closeTab('${path}')">×</span>
                    `;

              tab.addEventListener('click', (e) => {
                if (!e.target.classList.contains('tab-close')) {
                  this.openFile(path);
                }
              });

              container.appendChild(tab);
            });
          },

          updateTabStatus() {
            document.querySelectorAll('.tab').forEach(tab => {
              const path = tab.dataset.path;
              const isModified = this.state.modifiedFiles.has(path);

              if (isModified) {
                tab.classList.add('modified');
              } else {
                tab.classList.remove('modified');
              }
            });
          },

          async closeTab(path) {
            // Save before closing if modified
            if (this.state.modifiedFiles.has(path)) {
              await this.saveFile();
            }

            // Remove from open files
            const index = this.state.openFiles.indexOf(path);
            if (index > -1) {
              this.state.openFiles.splice(index, 1);
            }

            // Clear modified flag
            this.state.modifiedFiles.delete(path);

            // If closing current file, open another or clear editor
            if (this.state.currentFile === path) {
              if (this.state.openFiles.length > 0) {
                await this.openFile(this.state.openFiles[this.state.openFiles.length - 1]);
              } else {
                this.state.currentFile = null;
                this.editor.setValue('');
                this.updateStatusBar();
              }
            }

            // Update UI
            this.renderTabs();
          },

          updateFileTreeSelection() {
            document.querySelectorAll('.tree-item').forEach(item => {
              item.classList.remove('active');
              if (item.dataset.path === this.state.currentFile) {
                item.classList.add('active');
              }
            });
          },

          updateStatusBar() {
            if (!this.state.currentFile) {
              document.getElementById('status-file').innerHTML =
                `<i class="fas fa-file-code"></i> <span>No file</span>`;
              document.getElementById('status-position').innerHTML =
                `<i class="fas fa-location-arrow"></i> <span>Ln 1, Col 1</span>`;
              return;
            }

            const file = this.cache.fileContent.get(this.state.currentFile) || {
              name: this.state.currentFile.split('/').pop()
            };

            document.getElementById('status-file').innerHTML =
              `<i class="fas fa-file-code"></i> <span>${file.name}</span>`;

            const cursor = this.editor.selection.getCursor();
            document.getElementById('status-position').innerHTML =
              `<i class="fas fa-location-arrow"></i> <span>Ln ${cursor.row + 1}, Col ${cursor.column + 1}</span>`;
          },

          // ==================== 11.7. ASSET MANAGEMENT ====================
          async renderAssets() {
            const assets = await this.db.assets.toArray();
            this.state.assets = assets;

            const container = document.getElementById('assets-grid');
            container.innerHTML = '';

            if (assets.length === 0) {
              container.innerHTML = `
                    <div class="text-muted p-4 text-center">
                        <i class="fas fa-image fa-2x mb-2"></i>
                        <p>No assets uploaded yet</p>
                    </div>
                    `;
              return;
            }

            assets.forEach(asset => {
              const item = document.createElement('div');
              item.className = 'asset-item';
              item.dataset.id = asset.id;

              // Create preview based on type
              let preview = '';
              if (asset.type.startsWith('image/')) {
                const url = URL.createObjectURL(new Blob([asset.data]));
                preview = `<img src="${url}" class="asset-preview" alt="${asset.name}">`;
                this.cache.assetUrls.set(asset.id, url);
              } else {
                preview = `<div class="asset-preview flex items-center justify-center">
                            <i class="fas fa-file fa-2x text-muted"></i>
                        </div>`;
              }

              item.innerHTML = `
                    ${preview}
                    <div class="asset-info">
                        <div class="asset-name">${asset.name}</div>
                        <div class="asset-size">${this.formatFileSize(asset.size)}</div>
                    </div>
                    <div class="asset-actions">
                        <div class="asset-action" onclick="IDE.copyAssetName('${asset.name}')">
                            <i class="fas fa-copy"></i>
                        </div>
                        <div class="asset-action" onclick="IDE.deleteAsset('${asset.id}')">
                            <i class="fas fa-trash"></i>
                        </div>
                    </div>
                    `;

              container.appendChild(item);
            });
          },

          uploadAsset() {
            document.getElementById('asset-upload').click();
          },

          async handleAssetUpload(event) {
            const files = Array.from(event.target.files);

            for (const file of files) {
              try {
                // Validate file size (5MB max)
                if (file.size > 5 * 1024 * 1024) {
                  this.showToast('File Too Large', `${file.name} exceeds 5MB limit`, 'warning');
                  continue;
                }

                // Read file as ArrayBuffer
                const buffer = await this.readFileAsArrayBuffer(file);

                // Optimize image if needed
                let processedData = buffer;
                if (file.type.startsWith('image/')) {
                  processedData = await this.optimizeImage(file, buffer);
                }

                // Save to database
                await this.db.assets.add({
                  id: `${Date.now()}-${file.name}`,
                  name: file.name,
                  type: file.type,
                  data: processedData,
                  size: processedData.byteLength || processedData.length,
                  createdAt: Date.now()
                });

                this.showToast('Asset Uploaded', `${file.name} uploaded successfully`, 'success');
                this.logToConsole(`Uploaded: ${file.name}`, 'info');

              } catch (error) {
                this.showToast('Upload Failed', error.message, 'error');
              }
            }

            // Refresh assets display
            await this.renderAssets();

            // Reset input
            event.target.value = '';
          },

          async readFileAsArrayBuffer(file) {
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsArrayBuffer(file);
            });
          },

          async optimizeImage(file, buffer) {
            return new Promise((resolve, reject) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Calculate new dimensions (max 1200px)
                let width = img.width;
                let height = img.height;
                const maxSize = 1200;

                if (width > maxSize || height > maxSize) {
                  const ratio = Math.min(maxSize / width, maxSize / height);
                  width *= ratio;
                  height *= ratio;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to WebP for better compression
                canvas.toBlob(blob => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result);
                  reader.readAsArrayBuffer(blob);
                }, 'image/webp', 0.8);
              };
              img.onerror = reject;
              img.src = URL.createObjectURL(new Blob([buffer], {
                type: file.type
              }));
            });
          },

          copyAssetName(name) {
            navigator.clipboard.writeText(name);
            this.showToast('Copied to Clipboard', `"${name}" copied`, 'success');
          },

          async deleteAsset(id) {
            if (!confirm('Are you sure you want to delete this asset?')) return;

            try {
              await this.db.assets.delete(id);

              // Revoke object URL if exists
              if (this.cache.assetUrls.has(id)) {
                URL.revokeObjectURL(this.cache.assetUrls.get(id));
                this.cache.assetUrls.delete(id);
              }

              await this.renderAssets();
              this.showToast('Asset Deleted', 'Asset removed successfully', 'success');

            } catch (error) {
              this.showToast('Delete Failed', error.message, 'error');
            }
          },

          formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
          },

          toggleSidebarModal() {
            const modal = document.getElementById('sidebar-modal');
            modal.classList.toggle('active');

            // Update icon tombol
            const btn = document.querySelector('[onclick="IDE.toggleSidebarModal()"]');
            if (btn) {
              const icon = btn.querySelector('i');
              if (modal.classList.contains('active')) {
                icon.className = 'fas fa-times';
                btn.title = 'Close File Explorer';
              } else {
                icon.className = 'fas fa-folder-tree';
                btn.title = 'Show File Explorer';
              }
            }
          },

          closeSidebarModal() {
            const modal = document.getElementById('sidebar-modal');
            modal.classList.remove('active');

            // Reset icon
            const btn = document.querySelector('[onclick="IDE.toggleSidebarModal()"]');
            if (btn) {
              const icon = btn.querySelector('i');
              icon.className = 'fas fa-folder-tree';
              btn.title = 'Show File Explorer';
            }
          },

          // Pindahkan event listeners tree ke modal
          attachModalTreeEvents() {
            const modalTree = document.querySelector('.sidebar-modal .file-tree');
            if (modalTree) {
              // Salakan semua event listeners dari tree lama ke tree di modal
              this.attachTreeEventsToContainer(modalTree);
            }
          },

          attachTreeEventsToContainer(container) {
            container.querySelectorAll('.tree-item').forEach(item => {
              item.addEventListener('click', (e) => {
                if (e.target.closest('.actions')) return;

                const path = item.dataset.path;
                const type = item.dataset.type;

                if (type === 'folder') {
                  // Toggle folder
                  item.classList.toggle('expanded');
                } else {
                  this.openFile(path);
                  // Auto-close modal setelah buka file (opsional)
                  setTimeout(() => this.closeSidebarModal(), 300);
                }
              });

              // Context menu
              item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showContextMenu(e, item.dataset.path);
              });
            });
          },

          // ==================== 11.8. PREVIEW SYSTEM ====================
async runPreview() {
  try {
    this.showToast('Building Preview', 'Compiling project...', 'info');
    
    // Get all files
    const files = await this.db.files.where('type').equals('file').toArray();
    const assets = await this.db.assets.toArray(); // ← GET ASSETS
    
    // Find HTML file
    const htmlFile = files.find(f => f.name === 'index.html') || files[0];
    if (!htmlFile) {
      throw new Error('No HTML file found in project');
    }
    
    // Build HTML content
    let html = htmlFile.content;
    
    // ================ FIX 1: PROCESS ASSETS ================
    // Convert assets to blob URLs dan replace di HTML
    if (assets.length > 0) {
      console.log(`🎨 Processing ${assets.length} assets for preview...`);
      
      for (const asset of assets) {
        try {
          // Create blob URL untuk asset
          const blob = new Blob([asset.data], { type: asset.type });
          const blobUrl = URL.createObjectURL(blob);
          
          console.log(`  ✅ ${asset.name} → ${blobUrl.substring(0, 50)}...`);
          
          // Ganti semua kemungkinan referensi ke asset
          // Contoh: src="image.png" → src="blob:..."
          const escapedName = asset.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(["'\\(\\s])(\\b${escapedName}\\b)(["'\\)\\s>])`, 'gi');
          
          html = html.replace(regex, `$1${blobUrl}$3`);
          
          // Juga handle relative paths
          const relativeRegex = new RegExp(`(["'\\(\\s])(assets/|/assets/|./)?${escapedName}(["'\\)\\s>])`, 'gi');
          html = html.replace(relativeRegex, `$1${blobUrl}$3`);
          
        } catch (assetError) {
          console.warn(`  ❌ Failed to process ${asset.name}:`, assetError);
        }
      }
      
      this.logToConsole(`Processed ${assets.length} assets for preview`, 'info');
    } else {
      console.log('📭 No assets to process');
    }
    
    // Inject CSS files
    const cssFiles = files.filter(f => f.name.endsWith('.css'));
    cssFiles.forEach(css => {
      html = html.replace('</head>', `<style>${css.content}<\/style><\/head>`);
    });
    
    // Inject JS files
    const jsFiles = files.filter(f => f.name.endsWith('.js'));
    jsFiles.forEach(js => {
      html = html.replace('</body>', `<script>${js.content}<\/script><\/body>`);
    });
    
    // Inject console bridge (FIXED VERSION)
    const consoleBridge = `
<script>
(function() {
    // Cegah double initialization
    if (window.terraPreviewBridge) return;
    window.terraPreviewBridge = true;
    
    const methods = ['log', 'error', 'warn', 'info', 'debug'];
    methods.forEach(method => {
        const original = console[method];
        console[method] = function(...args) {
            try {
                window.parent.postMessage({
                    type: 'console',
                    method: method,
                    data: args.map(arg => 
                        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                    ),
                    source: 'preview'
                }, '*');
            } catch(e) {}
            return original.apply(console, args);
        };
    });
    
    window.addEventListener('error', function(e) {
        try {
            window.parent.postMessage({
                type: 'console',
                method: 'error',
                data: [e.message + ' at ' + (e.filename || 'unknown') + ':' + e.lineno],
                source: 'preview-error'
            }, '*');
        } catch(e) {}
    });
    
    // Debug: log asset info
    console.log('🔧 Preview initialized');
    console.log('📁 Assets:', ${JSON.stringify(assets.map(a => a.name))});
})();
<\/script>
        `;
    
    html = html.replace('<\/head>', consoleBridge + '<\/head>');
    
    // Create blob and display
    const blob = new Blob([html], {
      type: 'text/html'
    });
    const url = URL.createObjectURL(blob);
    
    const iframe = document.getElementById('preview-iframe');
    
    // Cleanup previous URL jika ada
    if (iframe.src && iframe.src.startsWith('blob:')) {
      URL.revokeObjectURL(iframe.src);
    }
    
    iframe.src = url;
    
    // Show preview modal
    this.showPreview();
    
    this.showToast('Preview Ready', `Loaded ${assets.length} assets`, 'success');
    this.logToConsole(`Preview started with ${assets.length} assets`, 'info');
    
  } catch (error) {
    console.error('Preview failed:', error);
    this.showToast('Preview Failed', error.message, 'error');
  }
},

          showPreview() {
            document.getElementById('preview-modal').classList.add('active');
            this.setPreviewSize('desktop');
          },

          closePreview() {
            const iframe = document.getElementById('preview-iframe');
            const src = iframe.src;
            iframe.src = 'about:blank';

            if (src.startsWith('blob:')) {
              URL.revokeObjectURL(src);
            }

            document.getElementById('preview-modal').classList.remove('active');
          },

          setPreviewSize(size) {
            this.state.previewSize = size;

            const container = document.getElementById('iframe-container');
            const label = document.getElementById('iframe-size-label');
            const buttons = document.querySelectorAll('.device-btn');

            // Update active button
            buttons.forEach(btn => btn.classList.remove('active'));
            document.querySelector(`[data-size="${size}"]`).classList.add('active');

            let width, height;

            switch (size) {
              case 'mobile':
                width = 375;
                height = 667;
                break;
              case 'tablet':
                width = 768;
                height = 1024;
                break;
              case 'desktop':
              default:
                width = 1200;
                height = 800;
                break;
            }

            // Update inputs
            document.getElementById('preview-width').value = width;
            document.getElementById('preview-height').value = height;

            // Apply size
            container.style.width = `${width}px`;
            container.style.height = `${height}px`;
            label.textContent = `${width} × ${height}`;
          },

          applyCustomSize() {
            const width = parseInt(document.getElementById('preview-width').value) || 1200;
            const height = parseInt(document.getElementById('preview-height').value) || 800;

            const container = document.getElementById('iframe-container');
            const label = document.getElementById('iframe-size-label');

            container.style.width = `${width}px`;
            container.style.height = `${height}px`;
            label.textContent = `${width} × ${height}`;

            // Update buttons
            document.querySelectorAll('.device-btn').forEach(btn => btn.classList.remove('active'));
          },

          refreshPreview() {
            const iframe = document.getElementById('preview-iframe');
            iframe.src = iframe.src;
            this.logToConsole('Preview refreshed', 'info');
          },

          // ==================== 11.9. CODE PROCESSING TOOLS ====================
          async runLint() {
            if (!this.state.currentFile) {
              this.showToast('No File Open', 'Open a file to lint', 'warning');
              return;
            }

            const content = this.editor.getValue();
            const filename = this.state.currentFile.split('/').pop();

            try {
              const issues = this.lintCode(content, filename);

              if (issues.length === 0) {
                this.showToast('Lint Passed', 'No issues found', 'success');
                this.logToConsole('Lint: No issues found', 'success');
              } else {
                this.showToast('Lint Issues Found', `${issues.length} issues detected`, 'warning');

                issues.forEach(issue => {
                  this.logToConsole(`${issue.type}: ${issue.message} (Line ${issue.line})`,
                    issue.severity === 'error' ? 'error' : 'warn');
                });
              }
            } catch (error) {
              this.showToast('Lint Failed', error.message, 'error');
            }
          },

          lintCode(code, filename) {
            const issues = [];

            // JavaScript linting
            if (filename.endsWith('.js')) {
              try {
                const ast = esprima.parseScript(code, {
                  tolerant: true,
                  loc: true
                });

                // Check for eval()
                if (this.state.astRules.noEval) {
                  const evalRegex = /eval\s*\(/g;
                  let match;
                  while ((match = evalRegex.exec(code)) !== null) {
                    const line = code.substring(0, match.index).split('\n').length;
                    issues.push({
                      line: line,
                      message: 'eval() is dangerous and should be avoided',
                      type: 'security',
                      severity: 'error'
                    });
                  }
                }

                // Check for var
                if (this.state.astRules.noVar) {
                  const varRegex = /\bvar\s+\w+/g;
                  let match;
                  while ((match = varRegex.exec(code)) !== null) {
                    const line = code.substring(0, match.index).split('\n').length;
                    issues.push({
                      line: line,
                      message: 'Use let/const instead of var',
                      type: 'style',
                      severity: 'warning'
                    });
                  }
                }

                // Check for strict mode
                if (this.state.astRules.strictMode && !code.includes('use strict')) {
                  issues.push({
                    line: 1,
                    message: 'Consider adding "use strict" directive',
                    type: 'suggestion',
                    severity: 'info'
                  });
                }

              } catch (error) {
                issues.push({
                  line: error.lineNumber || 1,
                  message: `Syntax error: ${error.message}`,
                  type: 'syntax',
                  severity: 'error'
                });
              }
            }

            // CSS linting
            if (filename.endsWith('.css')) {
              const lines = code.split('\n');
              lines.forEach((line, index) => {
                const trimmed = line.trim();

                // Missing semicolon
                if (trimmed && trimmed.includes(':') &&
                  !trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}')) {
                  issues.push({
                    line: index + 1,
                    message: 'Missing semicolon',
                    type: 'syntax',
                    severity: 'error'
                  });
                }

                // Empty rule
                if (trimmed.includes('{') && line.includes('}') &&
                  line.indexOf('}') - line.indexOf('{') === 1) {
                  issues.push({
                    line: index + 1,
                    message: 'Empty CSS rule',
                    type: 'style',
                    severity: 'warning'
                  });
                }
              });
            }

            return issues;
          },

          async beautifyCode() {
            if (!this.state.currentFile) {
              this.showToast('No File Open', 'Open a file to format', 'warning');
              return;
            }

            const overlay = this.showLoadingOverlay('Formatting code...');

            try {
              const content = this.editor.getValue();
              const filename = this.state.currentFile.split('/').pop();
              const ext = filename.split('.').pop().toLowerCase();

              // Map extension to file type
              const fileTypeMap = {
                'js': 'javascript',
                'jsx': 'javascript',
                'ts': 'javascript',
                'tsx': 'javascript',
                'css': 'css',
                'scss': 'css',
                'sass': 'css',
                'less': 'css',
                'html': 'html',
                'htm': 'html',
                'json': 'json',
                'md': 'markdown',
                'txt': 'text',
                'xml': 'html'
              };

              const fileType = fileTypeMap[ext] || ext;

              // Format dengan options
              const result = await this.formatter.formatCode(content, fileType, {
                indent_size: 2,
                preserve_newlines: true,
                max_preserve_newlines: 10
              });

              if (result.changed && result.code !== content) {
                const cursor = this.editor.getCursorPosition();
                this.editor.setValue(result.code, -1);
                this.editor.moveCursorToPosition(cursor);

                this.showToast('Code Formatted',
                  `Formatted using ${result.method}`,
                  'success');

                this.logToConsole(`Formatted ${filename} with ${result.method}`, 'info');

                // Mark as modified
                this.state.modifiedFiles.add(this.state.currentFile);
                this.updateTabStatus();
              } else {
                this.showToast('Already Formatted',
                  'Code is already properly formatted',
                  'info');
              }

            } catch (error) {
              console.error('Format error:', error);
              this.showToast('Format Failed', error.message, 'error');
              this.logToConsole(`Format error: ${error.message}`, 'error');
            } finally {
              this.hideLoadingOverlay(overlay);
            }
          },

          showLoadingOverlay(message) {
            const overlay = document.createElement('div');
            overlay.className = 'obfuscating-overlay active';
            overlay.innerHTML = `
        <div class="obfuscating-spinner"></div>
        <div class="obfuscating-text">${message}</div>
    `;

            document.querySelector('.editor-container').appendChild(overlay);
            return overlay;
          },

          hideLoadingOverlay(overlay) {
            if (overlay && overlay.parentNode) {
              overlay.remove();
            }
          },

          // Smart Minify dengan modal adaptif
          async minifyCode() {
            if (!this.state.currentFile) {
              this.showToast('No File Open', 'Open a file to minify', 'warning');
              return;
            }

            const content = this.editor.getValue();
            const filename = this.state.currentFile.split('/').pop();
            const ext = filename.split('.').pop().toLowerCase();
            const fileSize = content.length;
            const fileType = this.getFileType(ext); // ⭐ Tambahkan ini!

            // ⭐ PERBAIKAN: Tambahkan fileType parameter!
            const mode = await this.showMinifyModeModal(filename, fileSize, fileType);

            // Jika user cancel atau close modal
            if (!mode) {
              this.logToConsole('Minify cancelled by user', 'info');
              return;
            }

            // Show loading indicator
            const loadingId = this.showLoading(`Minifying in ${mode.toUpperCase()} mode...`);

            try {
              let minified = content;
              let method = 'custom';

              // Coba gunakan UglifyJS untuk JavaScript (full mode only)
              if (fileType === 'javascript' && mode === 'full' && typeof UglifyJS !== 'undefined') {
                try {
                  const result = UglifyJS.minify(content, {
                    output: {
                      beautify: false,
                      comments: /^!|@preserve|@license|@cc_on/
                    }
                  });
                  if (!result.error) {
                    minified = result.code;
                    method = 'uglify-js';
                  }
                } catch (error) {
                  console.log('UglifyJS failed, using fallback');
                }
              }

              // Gunakan custom minifiers jika UglifyJS tidak digunakan
              if (method === 'custom') {
                minified = this.selectMinifier(content, fileType, mode);
              }

              // Calculate metrics
              const originalSize = content.length;
              const minifiedSize = minified.length;
              const savings = originalSize - minifiedSize;
              const percent = originalSize > 0 ? ((savings / originalSize) * 100).toFixed(1) : '0.0';

              // Hide loading
              this.hideLoading(loadingId);

              if (minified !== content) {
                // Save cursor position
                const cursor = this.editor.getCursorPosition();

                // Update editor
                this.editor.setValue(minified, -1);

                // Restore cursor
                this.editor.moveCursorToPosition(cursor);

                // Show success message
                const sizeInfo = this.formatFileSize(savings);
                const message = savings > 0 ?
                  `${mode.toUpperCase()} mode: Saved ${percent}% (${sizeInfo})` :
                  `${mode.toUpperCase()} mode: No size reduction`;

                this.showToast(
                  'Code Minified',
                  message,
                  savings > 0 ? 'success' : 'info'
                );

                // Log details
                this.logToConsole(
                  `Minified ${filename} (${mode}): ${originalSize} → ${minifiedSize} bytes (${percent}% ${savings > 0 ? 'saved' : 'no change'})`,
                  savings > 0 ? 'success' : 'info'
                );

                // Mark as modified
                this.state.modifiedFiles.add(this.state.currentFile);
                this.updateTabStatus();

              } else {
                this.hideLoading(loadingId);
                this.showToast('No Changes', 'Code is already minified', 'info');
              }

            } catch (error) {
              this.hideLoading(loadingId);
              console.error('Minify error:', error);
              this.showToast('Minify Failed', error.message, 'error');
              this.logToConsole(`Minify error: ${error.message}`, 'error');
            }
          },

          // Helper: Map extension to file type
          getFileType(ext) {
            const typeMap = {
              // JavaScript
              'js': 'javascript',
              'jsx': 'javascript',
              'ts': 'javascript',
              'tsx': 'javascript',
              'mjs': 'javascript',
              'cjs': 'javascript',

              // CSS
              'css': 'css',
              'scss': 'css',
              'sass': 'css',
              'less': 'css',

              // HTML
              'html': 'html',
              'htm': 'html',
              'xhtml': 'html',

              // JSON
              'json': 'json',

              // Markdown
              'md': 'markdown',
              'markdown': 'markdown',
              'mdown': 'markdown',

              // XML
              'xml': 'xml',

              // Text
              'txt': 'text',
              'text': 'text',
              'log': 'text',

              // YAML
              'yml': 'text',
              'yaml': 'text',

              // Config files
              'ini': 'text',
              'conf': 'text',
              'cfg': 'text'
            };

            return typeMap[ext] || 'text'; // Default ke text
          },

          // Pilih minifier berdasarkan file type dan mode
          selectMinifier(code, fileType, mode) {
            const minifierMap = {
              'javascript': {
                lite: this.minifyJavaScriptLite.bind(this),
                full: this.minifyJavaScriptEnhanced.bind(this)
              },
              'css': {
                lite: this.minifyCSSLite.bind(this),
                full: this.minifyCSSEnhanced.bind(this)
              },
              'html': {
                lite: this.minifyHTMLLite.bind(this),
                full: this.minifyHTMLEnhanced.bind(this)
              },
              'json': {
                lite: this.minifyJSONLite.bind(this),
                full: this.minifyJSON.bind(this)
              },
              'markdown': {
                lite: this.minifyMarkdownLite.bind(this),
                full: this.minifyGeneric.bind(this)
              },
              'xml': {
                lite: this.minifyXMLLite.bind(this),
                full: this.minifyGeneric.bind(this)
              },
              'text': {
                lite: this.minifyTextLite.bind(this),
                full: this.minifyGeneric.bind(this)
              }
            };

            const minifier = minifierMap[fileType];
            if (minifier && minifier[mode]) {
              return minifier[mode](code);
            }

            // Fallback untuk unknown file types
            return mode === 'lite' ?
              this.minifyTextLite(code) :
              this.minifyGeneric(code);
          },

          // ⭐ TAMBAHKAN FUNGSI MINIFY LITE YANG BARU:

          minifyJSONLite(code) {
            try {
              const parsed = JSON.parse(code);
              // JSON Lite: Format dengan indentasi 2 spasi
              return JSON.stringify(parsed, null, 2);
            } catch {
              // Jika invalid JSON, coba perbaiki dulu
              const fixed = code
                .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3') // Add quotes to keys
                .replace(/,\s*}/g, '}') // Remove trailing commas
                .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays

              try {
                const parsed = JSON.parse(fixed);
                return JSON.stringify(parsed, null, 2);
              } catch {
                return code;
              }
            }
          },

          minifyMarkdownLite(code) {
            // Markdown Lite: Cleanup tanpa merusak struktur
            return code
              .replace(/\r\n/g, '\n') // Normalize line endings
              .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
              .replace(/^#\s+(.*)$/gm, '# $1') // Fix heading spacing
              .replace(/^\s*[-*+]\s+(.*)$/gm, '* $1') // Normalize list markers
              .replace(/[ \t]+$/gm, '') // Remove trailing spaces
              .replace(/^\s+/gm, '') // Remove leading spaces (kecuali indent)
              .trim();
          },

          minifyXMLLite(code) {
            // XML Lite: Format dengan indentasi
            let result = '';
            let indent = 0;
            let inTag = false;
            let tagBuffer = '';

            for (let i = 0; i < code.length; i++) {
              const char = code[i];

              if (char === '<') {
                inTag = true;
                tagBuffer = '<';
              } else if (char === '>') {
                inTag = false;
                tagBuffer += '>';

                const tag = tagBuffer;
                const isClosing = tag.startsWith('</');
                const isSelfClosing = tag.endsWith('/>');

                if (isClosing) {
                  indent = Math.max(0, indent - 1);
                  result += '\n' + '  '.repeat(indent) + tag;
                } else if (isSelfClosing) {
                  result += '\n' + '  '.repeat(indent) + tag;
                } else {
                  result += '\n' + '  '.repeat(indent) + tag;
                  indent++;
                }

                tagBuffer = '';
              } else if (inTag) {
                tagBuffer += char;
              } else if (char.trim() !== '') {
                // Text content
                if (result.endsWith('>')) {
                  result += '\n' + '  '.repeat(indent);
                }
                result += char;
              }
            }

            return result.trim();
          },

          minifyTextLite(code) {
            // Text Lite: Clean whitespace, keep structure
            return code
              .replace(/\r\n/g, '\n') // Normalize line endings
              .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
              .replace(/[ \t]+$/gm, '') // Remove trailing spaces
              .trim();
          },

          // ⭐ UPDATE showMinifyModeModal untuk adaptive modal:

          async showMinifyModeModal(filename, fileSize, fileType) {
            return new Promise((resolve) => {
              // ⭐ DETECT jika file type hanya punya 1 mode
              const hasLiteMode = ['javascript', 'css', 'html', 'json', 'markdown', 'xml', 'text'].includes(fileType);

              // Create modal container
              const modal = document.createElement('div');
              modal.id = 'minify-mode-modal';
              modal.className = 'minify-modal-overlay active';

              // Pilih template modal berdasarkan available modes
              modal.innerHTML = hasLiteMode ?
                this.createDualModeModal(filename, fileSize, fileType) :
                this.createSingleModeModal(filename, fileSize, fileType);

              // Add to DOM
              document.body.appendChild(modal);

              // Setup event listeners
              const closeModal = (mode = null) => {
                modal.classList.remove('active');
                setTimeout(() => {
                  if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                  }
                }, 300);
                resolve(mode);
              };

              // Close on overlay click
              modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                  closeModal();
                }
              });

              // Close on escape key
              const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                  document.removeEventListener('keydown', escapeHandler);
                  closeModal();
                }
              };
              document.addEventListener('keydown', escapeHandler);

              // Button handlers
              const closeBtn = modal.querySelector('.minify-modal-close');
              const cancelBtn = modal.querySelector('.cancel-btn');

              if (closeBtn) closeBtn.addEventListener('click', () => closeModal());
              if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal());

              // Handle mode buttons
              if (hasLiteMode) {
                modal.querySelector('.lite-btn').addEventListener('click', () => closeModal('lite'));
                modal.querySelector('.full-btn').addEventListener('click', () => closeModal('full'));

                // Option selection
                modal.querySelectorAll('.mode-option').forEach(option => {
                  option.addEventListener('click', () => {
                    const mode = option.dataset.mode;
                    closeModal(mode);
                  });
                });
              } else {
                modal.querySelector('.confirm-btn').addEventListener('click', () => closeModal('full'));
              }
            });
          },

          createDualModeModal(filename, fileSize, fileType) {
            return `
        <div class="minify-modal">
            <div class="minify-modal-header">
                <h3><i class="fas fa-compress"></i> Minify "${filename}"</h3>
                <button class="minify-modal-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="minify-modal-body">
                <div class="mode-options">
                    <div class="mode-option" data-mode="lite">
                        <div class="mode-icon">
                            <i class="fas fa-code"></i>
                        </div>
                        <div class="mode-content">
                            <h4>LITE Mode</h4>
                            <p>Keep structure, readable format</p>
                            <ul class="mode-features">
                                <li><i class="fas fa-check"></i> Maintain readability</li>
                                <li><i class="fas fa-check"></i> Preserve formatting</li>
                                <li><i class="fas fa-check"></i> Good for maintenance</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="mode-option" data-mode="full">
                        <div class="mode-icon">
                            <i class="fas fa-compress"></i>
                        </div>
                        <div class="mode-content">
                            <h4>FULL Mode</h4>
                            <p>Maximum compression, optimized</p>
                            <ul class="mode-features">
                                <li><i class="fas fa-check"></i> Maximum size reduction</li>
                                <li><i class="fas fa-check"></i> Optimized for production</li>
                                <li><i class="fas fa-check"></i> Best for deployment</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="file-info">
                    <div class="info-item">
                        <i class="fas fa-file-code"></i>
                        <span>${filename} (${fileType.toUpperCase()})</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-ruler"></i>
                        <span>${this.formatFileSize(fileSize)}</span>
                    </div>
                </div>
            </div>
            
            <div class="minify-modal-footer">
                <button class="btn btn-secondary cancel-btn">
                    <i class="fas fa-times"></i> Cancel
                </button>
                <div class="mode-buttons">
                    <button class="btn btn-primary lite-btn">
                        <i class="fas fa-code"></i> Use LITE
                    </button>
                    <button class="btn btn-warning full-btn">
                        <i class="fas fa-compress"></i> Use FULL
                    </button>
                </div>
            </div>
        </div>
    `;
          },

          createSingleModeModal(filename, fileSize, fileType) {
            return `
        <div class="minify-modal single-mode">
            <div class="minify-modal-header">
                <h3><i class="fas fa-compress"></i> Minify "${filename}"</h3>
                <button class="minify-modal-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="minify-modal-body">
                <div class="single-mode-info">
                    <div class="single-mode-icon">
                        <i class="fas fa-file-alt"></i>
                    </div>
                    <div class="single-mode-content">
                        <h4>${fileType.toUpperCase()} File</h4>
                        <p>This file type will be minified with standard optimization.</p>
                        <div class="mode-description">
                            <i class="fas fa-info-circle"></i>
                            <span>Whitespace will be removed and file will be optimized.</span>
                        </div>
                    </div>
                </div>
                
                <div class="file-info">
                    <div class="info-item">
                        <i class="fas fa-file-code"></i>
                        <span>${filename}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-ruler"></i>
                        <span>${this.formatFileSize(fileSize)}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-cog"></i>
                        <span>Standard Mode</span>
                    </div>
                </div>
            </div>
            
            <div class="minify-modal-footer">
                <button class="btn btn-secondary cancel-btn">
                    <i class="fas fa-times"></i> Cancel
                </button>
                <div class="mode-buttons">
                    <button class="btn btn-primary confirm-btn">
                        <i class="fas fa-compress"></i> Minify File
                    </button>
                </div>
            </div>
        </div>
    `;
          },

          // Helper functions
          showLoading(message) {
            const id = 'minify-loading-' + Date.now();

            const overlay = document.createElement('div');
            overlay.id = id;
            overlay.className = 'obfuscating-overlay active';
            overlay.innerHTML = `
        <div class="obfuscating-spinner"></div>
        <div class="obfuscating-text">${message}</div>
    `;

            const editorContainer = document.querySelector('.editor-container');
            if (editorContainer) {
              editorContainer.appendChild(overlay);
            }

            return id;
          },

          hideLoading(id) {
            const overlay = document.getElementById(id);
            if (overlay && overlay.parentNode) {
              overlay.remove();
            }
          },

          formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            if (bytes < 1024) return bytes + ' Bytes';
            if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / 1048576).toFixed(2) + ' MB';
          },

          minifyJavaScriptEnhanced(code) {
            // Preserve important comments, remove others
            return code
              // Preserve important comments (license, sourcemaps, etc)
              .replace(/\/\*![\s\S]*?\*\//g, (match) => {
                // Preserve license and important comments
                return match.includes('@license') ||
                  match.includes('@preserve') ||
                  match.includes('Copyright') ||
                  match.startsWith('/*!') ? match : '';
              })
              // Remove regular block comments (but keep on same line if needed)
              .replace(/\/\*[\s\S]*?\*\//g, (match, offset, string) => {
                // Check if comment is on its own line
                const before = string.substring(0, offset);
                const after = string.substring(offset + match.length);
                const isOnOwnLine = before.endsWith('\n') && after.startsWith('\n');

                return isOnOwnLine ? '\n' : '';
              })
              // Remove line comments (but keep if they contain important info)
              .replace(/\/\/.*$/gm, (match) => {
                return match.includes('@license') ||
                  match.includes('Copyright') ||
                  match.includes('http://') ||
                  match.includes('https://') ? match : '';
              })
              // Collapse whitespace
              .replace(/\s+/g, ' ')
              // Remove spaces around operators
              .replace(/\s*([=+\-*\/%&|^~!<>?:,{}()[\]])+\s*/g, '$1')
              // Remove space after ([{
              .replace(/([\[({])\s+/g, '$1')
              // Remove space before ])}
              .replace(/\s+([\])}])/g, '$1')
              // Remove semicolon before closing braces
              .replace(/;(\s*[\]}])/g, '$1')
              // Remove space after comma
              .replace(/,\s*/g, ',')
              // Remove trailing spaces
              .replace(/\s+$/gm, '')
              // Remove empty lines
              .replace(/^\s*[\r\n]/gm, '')
              .trim();
          },

          minifyCSSEnhanced(code) {
            return code
              // Preserve important comments
              .replace(/\/\*![\s\S]*?\*\//g, (match) => {
                return match.includes('@license') ||
                  match.includes('Copyright') ||
                  match.startsWith('/*!') ? match : '';
              })
              // Remove regular comments
              .replace(/\/\*[\s\S]*?\*\//g, '')
              // Collapse whitespace
              .replace(/\s+/g, ' ')
              // Remove spaces around brackets, colons, semicolons, commas
              .replace(/\s*([{}:;,])\s*/g, '$1')
              // Remove last semicolon in rule
              .replace(/;}/g, '}')
              // Remove space after colon in properties
              .replace(/: /g, ':')
              // Remove space after comma in selectors
              .replace(/,\s*/g, ',')
              // Remove unit from zero values (0px → 0, 0em → 0)
              .replace(/(\s|:)(0)(px|em|rem|vh|vw|vmin|vmax|%|cm|mm|in|pt|pc)/gi, '$1$2')
              // Remove leading zero from decimals (.5 instead of 0.5)
              .replace(/(\s|:)(0\.\d+)/g, '$1.$2')
              // Convert rgb() to hex when shorter
              .replace(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g, (match, r, g, b) => {
                const hex = '#' +
                  parseInt(r).toString(16).padStart(2, '0') +
                  parseInt(g).toString(16).padStart(2, '0') +
                  parseInt(b).toString(16).padStart(2, '0');
                return hex;
              })
              // Remove trailing spaces
              .replace(/\s+$/gm, '')
              .trim();
          },

          minifyHTMLEnhanced(code) {
            return code
              // Preserve conditional comments (IE)
              .replace(/<!--\[if[\s\S]*?<!\s*\[endif\]-->/g, (match) => match)
              // Remove regular comments (but preserve doctype and important ones)
              .replace(/<!--[\s\S]*?-->/g, (match) => {
                return match.includes('<!DOCTYPE') ||
                  match.includes('<!--[') ||
                  match.includes('[endif]-->') ? match : '';
              })
              // Remove whitespace between tags
              .replace(/>\s+</g, '><')
              // Collapse multiple whitespace
              .replace(/\s+/g, ' ')
              // Remove whitespace around attributes
              .replace(/\s*=\s*/g, '=')
              // Remove quotes from attributes when possible
              .replace(/\s([a-z]+)=["']([^"'\s]+)["']/gi, ' $1=$2')
              // Remove whitespace before closing bracket
              .replace(/\s+>/g, '>')
              // Remove whitespace after opening bracket
              .replace(/<\s+/g, '<')
              // Remove type attribute from script/style tags (HTML5)
              .replace(/<script[^>]*\s+type=["']text\/javascript["'][^>]*>/gi, '<script>')
              .replace(/<style[^>]*\s+type=["']text\/css["'][^>]*>/gi, '<style>')
              // Remove language attribute from script tags
              .replace(/<script[^>]*\s+language=["']javascript["'][^>]*>/gi, '<script>')
              // Trim
              .trim();
          },

          minifyJSON(code) {
            try {
              const parsed = JSON.parse(code);
              return JSON.stringify(parsed);
            } catch {
              // If invalid JSON, just remove whitespace
              return code.replace(/\s+/g, ' ').trim();
            }
          },

          minifyGeneric(code) {
            // Generic minifier for unknown file types
            return code
              .replace(/\s+/g, ' ')
              .replace(/\r\n/g, '\n')
              .replace(/\n\s*\n/g, '\n')
              .trim();
          },

          minifyHTMLLite(code) {
            // HTML Lite: Body content in logical single lines
            let result = '';
            let inHead = false;
            let inBody = false;
            let inStyle = false;
            let inScript = false;
            let inComment = false;
            let bodyBuffer = ''; // Buffer untuk konten body

            const lines = code.replace(/\r\n/g, '\n').split('\n');

            lines.forEach(line => {
              const trimmed = line.trim();
              if (!trimmed) return;

              // Handle comments
              if (trimmed.includes('<!--')) {
                if (!trimmed.includes('-->')) inComment = true;
                // Keep doctype and important comments
                if (trimmed.includes('<!DOCTYPE')) {
                  result += trimmed + '\n';
                } else {
                  result += '  ' + trimmed + '\n';
                }
                if (trimmed.includes('-->')) inComment = false;
                return;
              }
              if (inComment) {
                result += '  ' + trimmed + '\n';
                if (trimmed.includes('-->')) inComment = false;
                return;
              }

              // Detect sections
              const lowerTrimmed = trimmed.toLowerCase();

              if (lowerTrimmed === '<head>') {
                inHead = true;
                result += '<head>\n';
                return;
              }
              if (lowerTrimmed === '<\/head>') {
                inHead = false;
                result += '<\/head>\n';
                return;
              }
              if (lowerTrimmed === '<body>') {
                inBody = true;
                result += '<body>\n';
                return;
              }
              if (lowerTrimmed === '<\/body>') {
                inBody = false;
                // Process and flush body buffer
                const compressedBody = this.compressBodyContent(bodyBuffer);
                result += compressedBody + '\n<\/body>\n';
                bodyBuffer = '';
                return;
              }
              if (lowerTrimmed.startsWith('<style')) {
                inStyle = true;
                result += trimmed + '\n';
                return;
              }
              if (lowerTrimmed === '<\/style>') {
                inStyle = false;
                result += '<\/style>\n';
                return;
              }
              if (lowerTrimmed.startsWith('<script')) {
                inScript = true;
                result += trimmed + '\n';
                return;
              }
              if (lowerTrimmed === '<\/script>') {
                inScript = false;
                result += '<\/script>\n';
                return;
              }

              // Apply compression based on section
              if (inHead || inStyle || inScript) {
                // Keep formatting in head, style, script
                result += '  ' + trimmed + '\n';
              } else if (inBody) {
                // Add to body buffer for later compression
                bodyBuffer += trimmed + ' ';
              } else {
                // Outside body (doctype, html tag, etc)
                result += trimmed + '\n';
              }
            });

            return result.trim();
          },

          compressBodyContent(bodyContent) {
            // Smart grouping: container elements stay as single lines
            const logicalGroups = [];
            let currentGroup = '';
            let groupLevel = 0;

            // Split by tags but keep them
            const parts = bodyContent.split(/(<[^>]*>)/g);

            parts.forEach(part => {
              if (part.startsWith('<')) {
                // It's a tag
                const isContainerOpen = part.match(/^<(div|section|article|main|form|ul|ol|table)/i) && !part.endsWith('/>');
                const isContainerClose = part.match(/^<\/(div|section|article|main|form|ul|ol|table)/i);

                if (isContainerOpen) {
                  if (groupLevel === 0 && currentGroup.trim()) {
                    logicalGroups.push(currentGroup.trim());
                    currentGroup = '';
                  }
                  groupLevel++;
                  currentGroup += part;
                } else if (isContainerClose) {
                  groupLevel--;
                  currentGroup += part;
                  if (groupLevel === 0) {
                    logicalGroups.push(currentGroup.trim());
                    currentGroup = '';
                  }
                } else {
                  currentGroup += part;
                }
              } else if (part.trim()) {
                // Text content
                currentGroup += part.trim() + ' ';
              }
            });

            // Add last group
            if (currentGroup.trim()) {
              logicalGroups.push(currentGroup.trim());
            }

            // Compress each group
            return logicalGroups.map(group => {
              return group
                .replace(/>\s+</g, '><')
                .replace(/\s+/g, ' ')
                .replace(/\s+>/g, '>')
                .replace(/<\s+/g, '<')
                .trim();
            }).join('\n');
          },

minifyCSSLite(code) {
    // CSS Lite: One line per rule dengan format yang Anda inginkan
    let result = [];
    let currentBlock = null;
    let braceDepth = 0;
    
    const lines = code.replace(/\r\n/g, '\n').split('\n');
    
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      
      // Skip comments (kecuali yang penting)
      if (line.startsWith('/*')) {
        if (line.includes('*/')) {
          // Single line comment
          if (line.startsWith('/*!') ||
            line.includes('@license') ||
            line.includes('copyright')) {
            result.push(line);
          }
        }
        continue;
      }
      
      // Handle @ rules (media queries, keyframes, etc.)
      if (line.startsWith('@') && currentBlock === null) {
        if (line.includes('{')) {
          // @ rule dengan block
          currentBlock = {
            type: 'at-rule',
            selector: line.substring(0, line.indexOf('{')).trim(),
            rules: []
          };
          braceDepth = 1;
          
          // Cek apakah ada konten di baris yang sama
          const afterBrace = line.substring(line.indexOf('{') + 1).trim();
          if (afterBrace && !afterBrace.includes('}')) {
            this.processInnerCSS(afterBrace, currentBlock);
          }
        } else {
          // @ rule tanpa block (seperti @import)
          result.push(line);
        }
        continue;
      }
      
      if (currentBlock && currentBlock.type === 'at-rule') {
        // Di dalam @ rule block
        if (line.includes('{')) braceDepth++;
        if (line.includes('}')) braceDepth--;
        
        if (braceDepth === 0) {
          // Akhir dari @ rule block
          result.push(this.formatAtRuleBlock(currentBlock));
          currentBlock = null;
        } else {
          // Proses baris di dalam @ rule
          this.processInnerCSS(line, currentBlock);
        }
        continue;
      }
      
      // Regular CSS rule
      if (line.includes('{') && line.includes('}')) {
        // Rule lengkap dalam satu baris
        const rule = this.parseCSSRule(line);
        if (rule) {
          result.push(this.formatCSSRule(rule));
        }
      } else if (line.includes('{')) {
        // Mulai rule
        currentBlock = {
          type: 'regular',
          selector: line.substring(0, line.indexOf('{')).trim(),
          properties: ''
        };
        
        const afterBrace = line.substring(line.indexOf('{') + 1).trim();
        if (afterBrace) {
          currentBlock.properties += ' ' + afterBrace;
        }
      } else if (currentBlock && currentBlock.type === 'regular') {
        if (line.includes('}')) {
          // Akhir rule
          const beforeBrace = line.substring(0, line.indexOf('}')).trim();
          if (beforeBrace) {
            currentBlock.properties += ' ' + beforeBrace;
          }
          
          const formattedRule = this.formatCSSRule(currentBlock);
          if (formattedRule) {
            result.push(formattedRule);
          }
          currentBlock = null;
        } else {
          // Di dalam rule - tambahkan ke properties
          currentBlock.properties += ' ' + line;
        }
      }
    }
    
    // Handle block yang belum selesai
    if (currentBlock) {
      if (currentBlock.type === 'regular') {
        const formattedRule = this.formatCSSRule(currentBlock);
        if (formattedRule) {
          result.push(formattedRule);
        }
      }
    }
    
    return result.join('\n').trim();
  },
  
  processInnerCSS(line, block) {
    // Proses CSS di dalam @ rule blocks
    if (line.includes('{') && line.includes('}')) {
      // Rule lengkap
      const rule = this.parseCSSRule(line);
      if (rule) {
        block.rules.push(rule);
      }
    } else if (line.includes('{')) {
      // Mulai nested rule
      const nestedRule = {
        selector: line.substring(0, line.indexOf('{')).trim(),
        properties: ''
      };
      
      const afterBrace = line.substring(line.indexOf('{') + 1).trim();
      if (afterBrace) {
        nestedRule.properties += ' ' + afterBrace;
      }
      
      block.rules.push(nestedRule);
    } else if (line.includes('}')) {
      // Akhir nested rule
      const beforeBrace = line.substring(0, line.indexOf('}')).trim();
      if (beforeBrace && block.rules.length > 0) {
        const lastRule = block.rules[block.rules.length - 1];
        lastRule.properties += ' ' + beforeBrace;
      }
    } else {
      // Di dalam nested rule
      if (block.rules.length > 0) {
        const lastRule = block.rules[block.rules.length - 1];
        lastRule.properties += ' ' + line;
      }
    }
  },
  
  parseCSSRule(line) {
    // Parse CSS rule dari string
    const parts = line.split('{');
    if (parts.length < 2) return null;
    
    const selector = parts[0].trim();
    let properties = '';
    
    for (let i = 1; i < parts.length; i++) {
      properties += parts[i];
    }
    
    // Hapus closing brace
    properties = properties.replace(/}\s*$/, '').trim();
    
    return {
      selector: selector,
      properties: this.cleanCSSProperties(properties)
    };
  },
  
  formatCSSRule(rule) {
    // Format CSS rule sebagai satu baris
    if (!rule.selector || !rule.properties) return '';
    return rule.selector + ' { ' + rule.properties + ' }';
  },
  
  formatAtRuleBlock(block) {
    // Format @ rule block dengan indentasi yang benar
    let result = block.selector + ' {\n';
    
    block.rules.forEach(rule => {
      const formattedRule = this.formatCSSRule(rule);
      if (formattedRule) {
        result += '  ' + formattedRule + '\n';
      }
    });
    
    result += '}';
    return result;
  },
  
  cleanCSSProperties(props) {
    // Bersihkan dan optimalkan CSS properties
    return props
      .replace(/\s+/g, ' ') // Hilangkan multiple spaces
      .replace(/\s*;\s*/g, '; ') // Space setelah semicolon
      .replace(/\s*:\s*/g, ': ') // Space setelah colon
      .replace(/;(\s*$|;\s*)/g, ';') // Hapus semicolon duplikat
      .replace(/;\s*$/, '') // Hapus trailing semicolon
      .trim();
  },
  
  // Helper untuk memastikan properties bersih
  cleanProperties(props) {
    if (!props || typeof props !== 'string') return '';
    
    return props
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/\s*;\s*/g, '; ') // Space after semicolon
      .replace(/\s*:\s*/g, ': ') // Space after colon
      .replace(/;(\s*$|;\s*)/g, ';') // Remove duplicate semicolons
      .replace(/;\s*$/, '') // Remove trailing semicolon
      .trim();
  },
  
  processCSSBlock(block) {
    // Process @rule blocks (media queries, etc)
    const lines = block.split('\n');
    let result = '';
    let inBlock = false;
    let currentBlock = '';
    
    for (let line of lines) {
      if (!line.trim()) continue;
      
      if (line.includes('{')) {
        // Start block
        result += line + '\n';
        inBlock = true;
      } else if (line.includes('}')) {
        // End block
        if (currentBlock) {
          // Process inner rules
          result += this.processSingleLineBlock(currentBlock);
          currentBlock = '';
        }
        result += line + '\n';
        inBlock = false;
      } else if (inBlock) {
        // Collect inner rules
        currentBlock += line.trim() + ' ';
      } else {
        result += line + '\n';
      }
    }
    
    return result;
  },
  
  processSingleLineBlock(blockContent) {
    // Convert block content to one-line rules
    const rules = blockContent.split('}').filter(rule => rule.trim());
    let result = '';
    
    for (let rule of rules) {
      const parts = rule.split('{');
      if (parts.length === 2) {
        const selector = parts[0].trim();
        const properties = this.cleanCSSProperties(parts[1]);
        result += selector + ' { ' + properties + ' }\n';
      }
    }
    
    return result;
  },
  
  cleanCSSProperties(properties) {
    // Clean and optimize CSS properties for one-line display
    return properties
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .replace(/\s*;\s*/g, '; ') // Space after semicolon
      .replace(/\s*:\s*/g, ': ') // Space after colon
      .replace(/\s*!\s*important/g, ' !important') // Space before important
      .replace(/;(\s*})/g, '$1') // Remove trailing semicolon before }
      .replace(/\s+/g, ' ') // Collapse again
      .trim();
  },

minifyJavaScriptLite(code) {
    // Simple Lite mode: Keep basic structure, remove comments
    let result = '';
    let inString = false;
    let stringChar = '';
    let inComment = false;
    
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const nextChar = code[i + 1];
      
      // Handle escape sequences in strings
      if (inString && char === '\\') {
        result += char + (nextChar || '');
        i++; // Skip escaped character
        continue;
      }
      
      // Handle string boundaries
      if (!inComment && (char === '"' || char === "'" || char === '`')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (stringChar === char) {
          inString = false;
        }
        result += char;
        continue;
      }
      
      // Handle comments
      if (!inString) {
        if (char === '/' && nextChar === '*') {
          inComment = true;
          i++; // Skip *
          continue;
        }
        if (inComment && char === '*' && nextChar === '/') {
          inComment = false;
          i++; // Skip /
          continue;
        }
        if (inComment) {
          continue;
        }
        if (char === '/' && nextChar === '/') {
          // Skip to end of line
          while (i < code.length && code[i] !== '\n') i++;
          if (code[i] === '\n') result += '\n';
          continue;
        }
      }
      
      // Add character if not in comment
      if (!inComment) {
        result += char;
      }
    }
    
    // Post-processing: smart whitespace handling
    return this.formatJavaScriptLiteOutput(result);
  },
  
  formatJavaScriptLiteOutput(code) {
    // Basic formatting for readability
    let result = '';
    let indent = 0;
    let inMultiLine = false;
    
    const lines = code.split('\n');
    
    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Adjust indent based on braces
      const closeBraces = (trimmed.match(/}/g) || []).length;
      const openBraces = (trimmed.match(/{/g) || []).length;
      
      if (closeBraces > openBraces) {
        indent = Math.max(0, indent - (closeBraces - openBraces));
      }
      
      // Add line with indentation
      result += '  '.repeat(indent) + trimmed + '\n';
      
      if (openBraces > closeBraces) {
        indent += openBraces - closeBraces;
      }
    }
    
    return result.trim();
  },

          // Method untuk obfuscate
          async obfuscateCode() {
            if (!this.state.currentFile || !this.state.currentFile.endsWith('.js')) {
              this.showToast('JavaScript Only', 'Obfuscation works only with JS files', 'warning');
              return;
            }

            if (this.isObfuscating) {
              this.showToast('Already Processing', 'Please wait for current operation', 'warning');
              return;
            }

            const code = this.editor.getValue();

            if (!code || code.trim().length === 0) {
              this.showToast('Empty File', 'No code to obfuscate', 'warning');
              return;
            }

            try {
              this.isObfuscating = true;

              // Show loading state
              const originalContent = code;
              const originalCursor = this.editor.getCursorPosition();

              this.showToast('Obfuscating', 'Processing with professional engine...', 'info');
              this.logToConsole('Starting professional obfuscation...', 'info');

              // User options (bisa dibuat UI nanti)
              const userOptions = {
                debugProtection: false, // Set true untuk produksi
                disableConsoleOutput: true,
                compact: true,
                controlFlowFlattening: true
              };

              // Obfuscate
              const result = await this.obfuscator.obfuscate(code, userOptions);

              this.logObfuscationDetails(result);

              // Update editor
              this.editor.setValue(result.code, -1);

              // Show statistics
              const originalSize = originalContent.length;
              const obfuscatedSize = result.code.length;
              const ratio = ((obfuscatedSize - originalSize) / originalSize * 100).toFixed(1);

              // Log details
              this.logToConsole(`Original: ${originalSize} bytes`, 'info');
              this.logToConsole(`Obfuscated: ${obfuscatedSize} bytes`, 'info');
              this.logToConsole(`Size change: ${ratio}%`, ratio > 0 ? 'warn' : 'success');

              if (result.options.fallback) {
                this.logToConsole('⚠️ Using fallback transformer', 'warn');
              } else {
                this.logToConsole('✅ Professional obfuscation complete', 'success');
              }

              // Restore cursor position
              this.editor.moveCursorToPosition(originalCursor);

              // Show completion toast
              const message = result.options.fallback ?
                `Fallback obfuscation applied (${ratio}%)` :
                `Professional obfuscation complete (${ratio}%)`;

              this.showToast('Obfuscation Complete', message, 'success');

              // Mark as modified
              this.state.modifiedFiles.add(this.state.currentFile);
              this.updateTabStatus();

            } catch (error) {
              console.error('Obfuscation error:', error);
              this.showToast('Obfuscation Failed', error.message, 'error');
              this.logToConsole(`Obfuscation error: ${error.message}`, 'error');
            } finally {
              this.isObfuscating = false;
            }
          },

          logObfuscationDetails(result) {
            const details = `
=== OBFUSCATION REPORT ===
Engine: ${result.options.fallback ? 'Fallback Transformer' : 'Professional Obfuscator'}
Options: ${JSON.stringify(result.options, null, 2)}
Success: ${!!result.code}
Fallback Used: ${!!result.options.fallback}
    `.trim();

            this.logToConsole(details, 'info');
          },

          // Method untuk obfuscation options (UI modal nanti)
          showObfuscationOptions() {
            // Bisa implement modal untuk options
            const options = {
              compact: confirm('Use compact mode?'),
              controlFlowFlattening: confirm('Enable control flow flattening?'),
              stringArray: confirm('Enable string array encoding?'),
              selfDefending: confirm('Enable self-defending?')
            };

            return options;
          },

          analyzeAST() {
            if (!this.state.currentFile || !this.state.currentFile.endsWith('.js')) {
              this.showToast('JavaScript Only', 'AST analysis works only with JS files', 'warning');
              return;
            }

            try {
              const code = this.editor.getValue();
              const ast = esprima.parseScript(code, {
                tokens: true,
                comment: true,
                range: true,
                loc: true
              });

              // Count nodes
              let nodes = 0;
              let functions = 0;
              let variables = 0;

              const traverse = (node) => {
                nodes++;
                if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
                  functions++;
                }
                if (node.type === 'VariableDeclaration') {
                  variables += node.declarations.length;
                }

                for (const key in node) {
                  if (node[key] && typeof node[key] === 'object') {
                    if (Array.isArray(node[key])) {
                      node[key].forEach(traverse);
                    } else if (node[key].type) {
                      traverse(node[key]);
                    }
                  }
                }
              };

              traverse(ast);

              const analysis = `
AST Analysis Report:
-------------------
Total Nodes: ${nodes}
Functions: ${functions}
Variables: ${variables}
Complexity: ${Math.round(nodes / Math.max(1, functions))} nodes per function
                    `.trim();

              this.logToConsole(analysis, 'info');
              this.showToast('AST Analysis Complete', 'Report logged to console', 'success');

            } catch (error) {
              this.showToast('AST Analysis Failed', error.message, 'error');
            }
          },

          applyASTRules() {
            this.state.astRules = {
              noEval: document.getElementById('rule-no-eval').checked,
              noVar: document.getElementById('rule-no-var').checked,
              strictMode: document.getElementById('rule-strict-mode').checked,
              noWith: document.getElementById('rule-no-with').checked
            };

            this.showToast('Rules Applied', 'AST security rules updated', 'success');
            this.logToConsole('AST rules updated', 'info');
          },

          // ==================== 11.10. EXPORT & IMPORT ====================
          async exportProject() {
            try {
              this.showToast('Exporting Project', 'Creating ZIP archive...', 'info');

              const zip = new JSZip();

              // Add files
              const files = await this.db.files.where('type').equals('file').toArray();
              for (const file of files) {
                zip.file(file.path.substring(1), file.content);
              }

              // Add assets
              const assets = await this.db.assets.toArray();
              for (const asset of assets) {
                zip.file('assets/' + asset.name, asset.data);
              }

              // Generate ZIP
              const blob = await zip.generateAsync({
                type: 'blob'
              });

              // Create download link
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'terra-project-' + Date.now() + '.zip';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);

              this.showToast('Export Complete', 'Project downloaded as ZIP', 'success');
              this.logToConsole('Project exported as ZIP', 'info');

            } catch (error) {
              this.showToast('Export Failed', error.message, 'error');
            }
          },

          // ==================== 11.11. UTILITIES ====================
          logToConsole(message, type = 'log') {
            const output = document.getElementById('console-output');
            const entry = document.createElement('div');
            entry.className = `log-entry ${type}`;

            const time = new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });

            entry.innerHTML = `
                <span class="timestamp">[${time}]</span>
                <span>${message}</span>
                `;

            output.appendChild(entry);
            output.scrollTop = output.scrollHeight;
          },

          showToast(title, message, type = 'info') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;

            const icons = {
              success: 'fa-check-circle',
              error: 'fa-exclamation-circle',
              warning: 'fa-exclamation-triangle',
              info: 'fa-info-circle'
            };

            toast.innerHTML = `
                <i class="fas ${icons[type]} toast-icon"></i>
                <div class="toast-content">
                    <div class="toast-title">${title}</div>
                    <div class="toast-message">${message}</div>
                </div>
                `;

            container.appendChild(toast);

            // Auto remove after 5 seconds
            setTimeout(() => {
              toast.style.opacity = '0';
              setTimeout(() => toast.remove(), 300);
            }, 5000);
          },

          showContextMenu(event, path) {
            const menu = document.getElementById('context-menu');
            menu.style.top = `${event.pageY}px`;
            menu.style.left = `${event.pageX}px`;
            menu.classList.add('active');

            // Store current context
            menu.dataset.contextPath = path;

            // Close menu when clicking elsewhere
            const closeMenu = () => {
              menu.classList.remove('active');
              document.removeEventListener('click', closeMenu);
            };

            setTimeout(() => {
              document.addEventListener('click', closeMenu);
            }, 100);
          },

          // ==================== 11.12. EVENT HANDLERS ====================
          setupEventListeners() {
            // Console input
            const consoleInput = document.getElementById('console-input');
            consoleInput.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') {
                const command = consoleInput.value.trim();
                if (command) {
                  this.logToConsole(`> ${command}`, 'info');
                  this.executeConsoleCommand(command);
                  consoleInput.value = '';
                }
              }
            });

            // Di dalam setupEventListeners()

            // Keyboard shortcut untuk toggle sidebar (Ctrl/Cmd + B)
            document.addEventListener('keydown', (e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                this.toggleSidebarModal();
              }

              // ESC untuk close modal
              if (e.key === 'Escape') {
                this.closeSidebarModal();
              }
            });

            // Close modal saat klik overlay
            document.querySelector('.sidebar-modal-overlay').addEventListener('click', () => {
              this.closeSidebarModal();
            });

            // Di dalam setupEventListeners()
            document.addEventListener('keydown', (e) => {
              // Ctrl/Cmd + Shift + O untuk obfuscate
              if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'O') {
                e.preventDefault();
                this.obfuscateCode();
              }
            });

            // Initialize Color Lab Integration
            this.initColorLabIntegration();

            // Panel tabs
            document.querySelectorAll('.panel-tab').forEach(tab => {
              tab.addEventListener('click', () => {
                const panel = tab.dataset.panel;
                this.switchPanel(panel);
              });
            });

            // Asset upload
            document.getElementById('asset-upload').addEventListener('change', (e) => {
              this.handleAssetUpload(e);
            });

            // Window messages (for console bridge)
            window.addEventListener('message', (event) => {
              if (event.data && event.data.type === 'console') {
                this.logToConsole(event.data.data.join(' '), event.data.method);
              }
            });

            // Console bridge for preview
            window.addEventListener('message', (event) => {
              if (event.data && event.data.type === 'console') {
                this.logToConsole(event.data.data.join(' '), event.data.method);
              }
            });

            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
              // Ctrl/Cmd + S
              if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveFile();
              }

              // F5 for preview
              if (e.key === 'F5') {
                e.preventDefault();
                this.runPreview();
              }

              // Color Lab Shortcuts
              if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
                switch (e.key.toLowerCase()) {
                  case 'c': // Ctrl+Shift+C untuk Color Lab
                    e.preventDefault();
                    this.openColorLab();
                    break;

                  case 'h': // Ctrl+Shift+H untuk Color History
                    e.preventDefault();
                    if (this.ColorLab) this.ColorLab.toggleHistory();
                    break;
                }
              }

              // Ctrl/Cmd + F for format
              if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                this.beautifyCode();
              }
            });
          },

          // ==================== COLOR LAB INTEGRATION ====================
          initColorLabIntegration() {
            try {
              // Load CSS
              this.loadColorLabCSS();

              // Initialize integration module
              this.ColorLab = new ColorLabIntegration(this);

              console.log('✅ Color Lab Integration loaded');
            } catch (error) {
              console.error('Failed to initialize Color Lab:', error);
              this.showToast('Color Lab failed to load', 'Some features may not work', 'warning');
            }
          },

loadColorLabCSS() {
    // 1. Definisikan path relatif terhadap index.html (Root)
    const cssPath = 'css/color-lab.css'; 

    // 2. Cek apakah stylesheet sudah ada agar tidak double-load
    if (!document.querySelector(`link[href="${cssPath}"]`)) {
        const link = document.createElement('link');
        link.id = 'terra-color-lab-css'; // Tambahkan ID untuk tracking jika perlu
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = cssPath; // Menghapus './' lebih disarankan untuk GitHub Pages
        
        document.head.appendChild(link);
        
        // Log untuk debugging di konsol IDE Anda
        this.logToConsole('Color Lab CSS integrated successfully', 'success');
    }
},


          openColorLab(color) {
            if (this.ColorLab) {
              this.ColorLab.open(color);
            }
          },

          closeColorLab() {
            if (this.ColorLab) {
              this.ColorLab.closeC();
            }
          },

          insertColor(color) {
            if (this.ColorLab) {
              this.ColorLab.insertColor(color);
            } else {
              // Fallback
              if (this.editor) {
                const cursor = this.editor.getCursorPosition();
                this.editor.session.insert(cursor, color + ' ');
              }
            }
          },

          switchPanel(panel) {
            this.state.activePanel = panel;

            // Update tabs
            document.querySelectorAll('.panel-tab').forEach(tab => {
              tab.classList.remove('active');
              if (tab.dataset.panel === panel) {
                tab.classList.add('active');
              }
            });

            // Update content
            document.querySelectorAll('.panel-content').forEach(content => {
              content.classList.remove('active');
              if (content.id === `${panel}-panel`) {
                content.classList.add('active');
              }
            });
          },

          executeConsoleCommand(command) {
            try {
              command = command.trim();

              // Built-in commands
              if (command === 'clear' || command === 'cls') {
                document.getElementById('console-output').innerHTML = '';
                return;
              }

              if (command === 'help' || command === '?') {
                this.showConsoleHelp();
                return;
              }

              if (command === 'version' || command === 'ver') {
                this.logToConsole('TERRA IDE 4.0 - Ultra Fusion', 'info');
                return;
              }

              // Security: Check for dangerous patterns
              if (this.isDangerousCommand(command)) {
                this.logToConsole('Command blocked for security reasons', 'error');
                return;
              }

              // Sandbox execution
              const result = this.executeInSandbox(command);
              this.logToConsole(String(result), 'log');

            } catch (error) {
              this.logToConsole(`Error: ${error.message}`, 'error');
            }
          },

          isDangerousCommand(command) {
            const dangerousPatterns = [
              /\.\s*(delete|remove|clear|drop)\s*\(/i,
              /localStorage/i,
              /sessionStorage/i,
              /IndexedDB/i,
              /fetch\s*\(/i,
              /XMLHttpRequest/i,
              /import\s*\(/i,
              /require\s*\(/i,
              /process\./i,
              /document\./i,
              /window\./i,
              /IDE\./i, // Blok akses ke object IDE
              /this\./i,
              /eval\s*\(/i,
              /Function\s*\(/i,
              /setTimeout\s*\(/i,
              /setInterval\s*\(/i,
              /new\s+ActiveXObject/i
            ];

            return dangerousPatterns.some(pattern => pattern.test(command));
          },

          executeInSandbox(command) {
            // Whitelist of safe global objects
            const safeGlobals = {
              Math: Math,
              Date: Date,
              JSON: JSON,
              Number: Number,
              String: String,
              Boolean: Boolean,
              Array: Array,
              Object: Object,
              RegExp: RegExp,
              Error: Error,
              isNaN: isNaN,
              isFinite: isFinite,
              parseFloat: parseFloat,
              parseInt: parseInt,
              encodeURI: encodeURI,
              decodeURI: decodeURI,
              encodeURIComponent: encodeURIComponent,
              decodeURIComponent: decodeURIComponent
            };

            // Remove console.log, alert, prompt, confirm from sandbox
            const sandbox = Object.assign({}, safeGlobals);

            // Create function with sandboxed globals
            const func = new Function(...Object.keys(sandbox), `
        'use strict';
        try {
            return ${command};
        } catch(e) {
            return e.message;
        }
    `);

            return func(...Object.values(sandbox));
          },

          showConsoleHelp() {
            const helpText = `
Available Commands:
-------------------
clear, cls      - Clear console
help, ?        - Show this help
version, ver   - Show IDE version
ls             - List files (coming soon)
pwd            - Show current directory (coming soon)

Safe Operations:
---------------
Math.sqrt(25)           - Math operations
Date.now()              - Date functions
JSON.parse('{"a":1}')   - JSON utilities
[1,2,3].map(x => x*2)   - Array operations
'hello'.toUpperCase()   - String methods

⚠️ Security Notes:
- No file system access
- No DOM manipulation
- No network access
- No application state access
    `.trim();

            helpText.split('\n').forEach(line => {
              this.logToConsole(line, 'info');
            });
          },

          // ==================== 11.13. PUBLIC API ====================
          createFile() {
            // For simplicity, create a basic file
            const name = prompt('Enter file name (e.g., script.js):', 'newfile.js');
            if (!name) return;

            // In production, would create in database and open
            this.logToConsole(`Creating file: ${name}`, 'info');
            this.showToast('Coming Soon', 'File creation in next update', 'info');
          },

          createFolder() {
            const name = prompt('Enter folder name:', 'newfolder');
            if (!name) return;

            this.logToConsole(`Creating folder: ${name}`, 'info');
            this.showToast('Coming Soon', 'Folder creation in next update', 'info');
          },

          deleteFile(path) {
            if (confirm('Are you sure you want to delete this file?')) {
              this.logToConsole(`Deleting file: ${path}`, 'info');
              this.showToast('Coming Soon', 'File deletion in next update', 'info');
            }
          },

          toggleSidebar() {
            const sidebar = document.querySelector('.sidebar');
            sidebar.style.display = sidebar.style.display === 'none' ? 'flex' : 'none';
          },

          refreshFileTree() {
            this.renderFileTree();
            this.showToast('Refreshed', 'File tree updated', 'success');
          }
        };

        // ==================== 11.14. INITIALIZATION ====================
        document.addEventListener('DOMContentLoaded', () => {
          IDE.init();

          // Add welcome message to console
          setTimeout(() => {
            IDE.logToConsole('Welcome to TERRA PRO IDE 4.0 - Ultra Fusion Edition', 'info');
            IDE.logToConsole('Type "help" for available commands', 'info');
          }, 1000);
        });
