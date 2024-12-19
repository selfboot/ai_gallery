---
title: Building Minesweeper Game from Scratch with Claude3.5 - Adding Color Themes
date: '2024-12-19 20:00:00'
tags: ['claude', 'minesweeper']
keywords: ['Frontend development with Claude3.5', 'Minesweeper game development', 'Online Minesweeper']
description: Learn how to enhance a Minesweeper game with theme switching functionality using Claude3.5, including creating theme configuration files, modifying rendering logic, and adding UI components. Share solutions to development challenges like optimizing border colors in dark mode and debugging theme switching issues. Demonstrate how to leverage Claude3.5 to quickly design and implement multiple attractive theme schemes, highlighting AI's advantages in improving development efficiency.
---

This is the third article in the series about building a Minesweeper game from scratch using Claude3.5. The previous two articles are:

1. [Building Minesweeper Game from Scratch with Claude3.5 - Basic Features](https://gallery.selfboot.cn/en/blog/minesweeper)
2. [Building Minesweeper Game from Scratch with Claude3.5 - Hexagonal Mode](https://gallery.selfboot.cn/en/blog/minesweeper2)

Our Minesweeper game now has comprehensive features and supports hexagonal grid layout, attracting quite a few players. However, one drawback is that the game's appearance is rather monotonous, only mimicking the classic Minesweeper style. I wanted to add various color themes and create a vibrant Minesweeper interface - could Claude3.5 help me achieve this?

Of course it could, and both the implementation speed and results exceeded my expectations. Let's first look at the different theme effects, which you can try out on the [Minesweeper page](https://gallery.selfboot.cn/en/games/minesweeper):

![Various Minesweeper themes by Claude3.5](https://slefboot-1251736664.file.myqcloud.com/20241219_ai_gallery_minesweeper_themes.png)

## Theme Support with Claude3.5

When implementing the Minesweeper game earlier, we had already separated the logic from the rendering, making it convenient to add themes now. I simply prompted Claude3.5 that I wanted to support different themes and asked for help with implementation.

During rendering, we replaced hardcoded theme colors with configuration-based colors. Since we weren't using a composer, while the theme configuration file `themes.js` code was generated, we needed to create the file manually and apply the changes.

The UI components also needed corresponding modifications, requiring the addition of a theme selection dropdown component that could trigger re-rendering when a theme color was selected. My project already had many dropdown selection boxes on other pages, and to maintain consistent styling, I had previously extracted a separate CustomListbox component located in the `app/components/ListBox` file.

In such moderately-sized projects, if you want to use independent components or basic libraries in a modification, you need to explicitly mention and reference the files. This helps Claude3.5 locate the corresponding files and adapt to the components.

While Claude3.5's overall modifications seemed reasonable, manual inspection and adjustment become necessary once the number of changes increases.

## Fixing Theme Bugs with Claude3.5

After implementing the themes, several issues emerged during actual operation. For instance, some colors were still hardcoded and not using the theme configuration colors. These could be easily fixed by pointing them out to Claude3.5 with simple prompts:

> Why are there still hardcoded colors here? They should use theme colors instead
>
> // Draw highlight point  
> const highlightRadius = radius * 0.35;  
> this.ctx.fillStyle = "#FFFFFF";  

The fix was simple - adding a highlight color configuration to the theme and using it. However, since I wasn't using a composer, it only modified the classic Minesweeper style I mentioned. The hexagonal mode's style remained unchanged and needed another reminder.

There were other instances of hardcoded colors that Claude3.5 wouldn't fix automatically - each requiring a separate prompt, which was somewhat tedious. In retrospect, I could have modified the prompt to ask it to find all hardcoded colors in the rendering process and change them to use configuration values.

While such minor issues were easy to fix, some required human discovery and optimization suggestions. For example, the current color configuration made the borders between revealed cells in dark mode black, lacking contrast and making boundaries indistinguishable.

Claude3.5 knew to adjust the border color in dark mode, but its suggested colors still lacked sufficient contrast. I experimented with several colors and selected one that worked better. Here's the change:

```javascript
dark: {
    name: "dark",
    cellBackground: "#424242",
    revealedBackground: "#303030",
    borderBright: "#626262",
    borderDark: "#212121",
    numberColors: ["", "#4FC3F7", "#81C784", "#E57373", "#64B5F6", "#BA68C8", "#4DB6AC", "#F06292", "#FFB74D"],
    mineColor: "#E0E0E0",
    flagColor: "#EF5350",
    explodedBackground: "#D32F2F",
    outerBackground: "#424242",
    mineHighlight: "#AAAAAA",
    // revealedBorder: "#505050"  // Claude's choice for revealed cell borders, using lighter gray
    revealedBorder: "#767676",    // Manually selected color with better contrast
}
```

These were minor issues, but Claude3.5 often has such small problems when making changes to more complex code, requiring manual inspection and adjustment.

Another issue was that theme switching didn't take effect, staying with the initial theme colors. Having no clear direction myself, I asked Claude3.5, which offered various guesses and attempts, but none worked.

Realizing AI alone wasn't enough, I had to investigate myself. After adding logs to core paths, I discovered that after switching themes, the theme name used to initialize the rendering component didn't match the configuration.

Some project background: to preserve user configurations, settings are saved to the browser's local storage and loaded when revisiting the page. Additionally, for internationalization support, dropdown box values need to be translated through i18n.

After adding this complexity, Claude3.5's generated code was reading the pre-translated theme names from the dropdown. For example, the "dark" theme was getting "dark_theme" as the theme name.

After identifying the issue, telling Claude3.5 about these findings led to a quick and correct fix. Even after identifying the problem, I'm not very familiar with frontend JavaScript and would have needed time to research the implementation. With AI assistance, I could focus on problem identification while AI handled the code modifications.

## Adding More Themes with Claude3.5

After getting one theme working well, I wanted to add more. Creating Minesweeper themes manually would require careful consideration of colors for each element, making it time-consuming and labor-intensive. With Claude3.5, it became incredibly convenient, as it excels at such pattern-following tasks.

A simple prompt was all it took:

> I'd like to add a green theme, please set up the various colors to make the overall board look elegant and appealing

Of course, when prompting in Cursor, I included the themes.js file as a reference, making it easier for Claude3.5 to locate the appropriate position. Claude3.5's theme configuration was quite satisfactory in terms of overall color coordination.

```javascript
green: {
    name: "green",
    cellBackground: "#A8D5BA",
    revealedBackground: "#E8F5E9",
    borderBright: "#C8E6C9",
    borderDark: "#2E7D32",
    revealedBorder: "#81C784",
    numberColors: [
      "", // 0 - No color
      "#1B5E20", // 1 - Dark green
      "#0277BD", // 2 - Blue
      //...
    ],
    mineColor: "#1B5E20",
    mineHighlight: "#FFFFFF",
    flagColor: "#D32F2F",
    explodedBackground: "#EF5350",
    outerBackground: "#A8D5BA",
},
```

After adding the theme, I still needed to remind it to modify the UI components to support the new theme. Adding subsequent themes became much easier with a simple prompt:

> Please add a yellow theme as well

And a new theme was created. Running out of theme ideas, I asked:

> What other good color themes would work well for Minesweeper? Please suggest a few

It then generated three themes - Ocean, Sunset, and Forest:

- Ocean theme: Uses refreshing blue tones for a cool, calming feel, suitable for extended gameplay without visual fatigue
- Sunset theme: Warm orange tones creating a dusk, cozy atmosphere, with dark-colored numbers for readability
- Forest theme: Deep green tones for a natural, steady feel, darker than the previous green theme

Since the Forest theme was similar to my existing green theme, I didn't include it.

## Claude3.5 as an Efficiency Tool - Summary

Through this process of adding themes to the Minesweeper game, we once again experienced the power of Claude3.5 as an efficiency tool:

1. **Rapid Basic Feature Implementation**: When implementing theme switching functionality from scratch, Claude3.5 quickly generated theme configuration files, modified rendering logic, and added UI components, significantly reducing development time.

2. **Debugging Assistance**: While Claude3.5 might have minor issues with complex changes, once we identified specific problems (like theme switching not working), it could quickly provide accurate fixes, allowing us to focus on problem identification rather than code implementation.

3. **Creative Design Assistant**: When designing new themes, Claude3.5 demonstrated strong creative capabilities. It not only generated harmonious color schemes based on requirements (like "green theme") but also proactively suggested new theme ideas (like Ocean and Sunset themes), considering both aesthetics and functionality.

4. **High Efficiency in Repetitive Tasks**: During the process of adding multiple themes, Claude3.5 showed exceptional efficiency. It could quickly replicate existing patterns with appropriate adjustments, ensuring new themes maintained consistency while remaining distinct.

In conclusion, Claude3.5 played multiple roles in this theme development process - development assistant, creative consultant, and debugging helper. While human intervention and judgment are still needed in complex scenarios, it significantly improved development efficiency, making the entire development process smoother and more enjoyable.