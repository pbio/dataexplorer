## Data Analysis Platform
This is a quickbuild platform to generate plots from data files. 
The app allows a user to upload one or more csv files and ask questions or generate plots from the data. Plots can be iterated on to modify them. 
A user can also save a plot and view them. 


## Efficient useage of LLM
The app attempts to us the LLM in a efficient manner as these datasets can be very large.
Based on the user's prompt and csv uploaded it will first try to decide which columns are useful and then make a second request to only send the columns that are needed. 
There is also an input from the user to decide how many columns to use, so that they can first run smaller requests before using the full data set. 

## Getting Started

First, run the development server:

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

If running locally, please add the following to your .env.local
ANTHROPIC_API_KEY = XXXX
DEMO_PASSWORD= any_password_you_want

## Demo:
Demo is available at https://dataexplorer-v2.vercel.app/
I have set low token limits for claude to avoid getting charged too much. 

## Tech Stack:
LLM: anthropics Claude version claude-sonnet-4-20250514
JS framework: Next.js with typescript with node.js backend
Component library: Mantine
Ploting Library: VegaLite -> allows creating interactive plots using a json input. 
DB hosting: Neon.tech postgres.db free tier with AWS; Only one table to save plots. 
Site hosting: Vercel -> quick and easy to deploy directly from github. 
