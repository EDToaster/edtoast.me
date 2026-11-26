--[[
Pandoc filter for the résumé's HTML build (see build.mjs).

Pandoc expands the résumé's own macros, but the layout primitives underneath
them mean nothing in HTML. Read with +raw_tex they reach this filter as raw
TeX, and it turns them into structure the site can style:

  text \\ \hrulefill     ruled line       <h2>text</h2>
  {\Huge text}           display line     <h1>text</h1>
  left \hfill right      spread line      <div class="resume-row"><span>left</span><span>right</span></div>
  \begin{center}         contact block    bare e-mail addresses and URLs become links
  $\cdot$  $\bullet$     separators       · •

All other raw TeX (\vspace, \hspace, ...) is spacing and is dropped.
]]

local SYMBOLS = { cdot = "·", bullet = "•" }
local DISPLAY_SIZES = { Huge = true, huge = true, LARGE = true }

local function command(el)
  if el.t == "RawInline" and (el.format == "latex" or el.format == "tex") then
    return el.text:match("^\\(%a+)")
  end
end

local function is_space(el)
  return el.t == "Space" or el.t == "SoftBreak"
end

local function trim(inlines)
  while #inlines > 0 and is_space(inlines[1]) do
    inlines:remove(1)
  end
  while #inlines > 0 and is_space(inlines[#inlines]) do
    inlines:remove()
  end
  return inlines
end

-- Headings are styled by the site, so they do not keep the source's small caps.
local function heading(level, inlines)
  return pandoc.Header(level, inlines:walk({
    SmallCaps = function(el)
      return el.content
    end,
  }))
end

-- Split a paragraph at its \\ breaks. Each line is a list of parts separated
-- by \hfill, plus whether it carried a rule or a display size.
local function lines_of(inlines)
  local lines = {}
  local line = { parts = { pandoc.Inlines({}) } }
  local function finish()
    for _, part in ipairs(line.parts) do
      trim(part)
    end
    line.empty = #line.parts == 1 and #line.parts[1] == 0
    table.insert(lines, line)
    line = { parts = { pandoc.Inlines({}) } }
  end
  for _, el in ipairs(inlines) do
    local name = command(el)
    if el.t == "LineBreak" then
      finish()
    elseif name == "hfill" then
      table.insert(line.parts, pandoc.Inlines({}))
    elseif name == "hrulefill" then
      line.rule = true
    elseif DISPLAY_SIZES[name] then
      line.display = true
    elseif not name then
      line.parts[#line.parts]:insert(el)
    end
  end
  finish()
  return lines
end

local function Para(para)
  local blocks = pandoc.Blocks({})
  local pending = {} -- plain lines waiting to become one paragraph

  local function flush()
    if #pending == 0 then
      return
    end
    local inlines = pandoc.Inlines({})
    for i, text in ipairs(pending) do
      if i > 1 then
        inlines:insert(pandoc.LineBreak())
      end
      inlines:extend(text)
    end
    blocks:insert(pandoc.Para(inlines))
    pending = {}
  end

  for _, line in ipairs(lines_of(para.content)) do
    if line.rule then
      -- The rule sits under the line before it, which makes that line a heading.
      local title = line.empty and table.remove(pending) or line.parts[1]
      flush()
      blocks:insert(title and heading(2, title) or pandoc.HorizontalRule())
    elseif line.empty then
      -- A break with nothing on the line is vertical spacing.
    elseif line.display then
      flush()
      blocks:insert(heading(1, line.parts[1]))
    elseif #line.parts > 1 then
      flush()
      local spans = pandoc.Inlines({})
      for _, part in ipairs(line.parts) do
        spans:insert(pandoc.Span(part))
      end
      blocks:insert(pandoc.Div({ pandoc.Plain(spans) }, { class = "resume-row" }))
    else
      table.insert(pending, line.parts[1])
    end
  end
  flush()
  return blocks
end

local function autolink(str)
  local text = str.text
  if text:match("^[%w._%%+-]+@[%w.-]+%.%a%a+$") then
    return pandoc.Link(text, "mailto:" .. text)
  end
  local host, path = text:match("^(%w[%w.-]*%.%a%a+)(.*)$")
  if host and (path == "" or path:sub(1, 1) == "/") then
    return pandoc.Link(text, "https://" .. text)
  end
end

return {
  {
    -- Pandoc wraps TeX groups in attribute-less spans; unwrap them so the raw
    -- commands inside are visible at paragraph level.
    Span = function(el)
      if el.identifier == "" and #el.classes == 0 and #el.attributes == 0 then
        return el.content
      end
    end,
    Math = function(el)
      local symbol = SYMBOLS[el.text:match("^%s*\\(%a+)%s*$")]
      if symbol then
        return pandoc.Str(symbol)
      end
    end,
  },
  {
    Para = Para,
    Div = function(el)
      if el.classes:includes("center") then
        return el:walk({ Str = autolink })
      end
    end,
    -- One paragraph per item reads as a tight list: <li>text</li>, not <li><p>.
    BulletList = function(el)
      for _, item in ipairs(el.content) do
        if #item == 1 and item[1].t == "Para" then
          item[1] = pandoc.Plain(item[1].content)
        end
      end
      return el
    end,
  },
}
