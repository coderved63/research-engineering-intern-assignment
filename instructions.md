# Research Intern Assignment
We're thrilled you're interested in joining SimPPL! This assignment is designed to give you a practical, hands-on experience in social media analysis, mirroring the kind of work you'd be doing with us.  It's structured like a mini-research project, challenging you to explore how information spreads across social networks, specifically focusing on content from potentially unreliable sources.  Instead of building a data collection tool from scratch for this initial exercise, you'll be provided with existing social media data. Your task is to design and build an interactive dashboard to analyze and visualize this data, uncovering patterns and insights about how specific links, hashtags, keywords, or topics are being shared and discussed.  This will allow you to focus on your data science, machine learning, and analysis skills, which are crucial to the research we conduct at SimPPL. The plots you create and the technologies you choose will be valuable learning experiences, and directly relevant to the work we do. 

## Why do we care about this?

We have built tools for collecting and analyzing data from Reddit and Twitter including [Parrot](https://parrot.simppl.org) to study the sharing of news from certain unreliable Russian media providers. To ramp you up towards understanding how to go about extending such platforms, and to expand your understanding of the broader social media ecosystem, we would like you to construct a similar analysis to Parrot by studying other publicly accessible platforms listed above. We would like you to present an analysis of a broader range of viewpoints from different (apolitical / politically biased) groups. You may even pick a case study to present e.g. a relevant controversy, campaign, or civic event. 

In the long run, this research intends to accomplish the following objectives:

1. Track different popular trends to understand how public content is propagated on different social media platforms.
2. Identify posts containing misleading information with the use of claims verification mechanisms.
3. Analyze the trends across a large number of influential accounts over time in order to report on the influence of a narrative.

## Task Objectives

1. **Visualize Insights**: Tell a story with a graph, building intuitive and engaging data visualizations.

2. **Apply AI/ML**: Use LLMs and machine learning to generate metrics and enhance your analysis.

3. **Build and Deploy a Dashboard**: Develop and (ideally) host an interactive dashboard to showcase your analysis.


## Rubric for Evaluation
Take a look at <a href="https://parrot.simppl.org/">parrot</a> that we have previously built as a visualization platform for Twitter data (it does not have search integrations though it is a good example of a solution other than that). Below is the rubric we will use for your evaluation, provided as a checklist for you to evaluate your own assignment before you submit it to us. 

1. **IMPORTANT** Is the solution well-documented such that it is easy to understand its usage?
  
2. **IMPORTANT** Is the solution hosted with a neatly designed frontend?
   
3. **IMPORTANT** Does the solution visualize summary statistics for the results? For example:

  &emsp; a. Time series of the number of posts matching a search query 
  
  &emsp; b. Time series of key topics, themes, or trends in the content
  
  &emsp; c. Pie chart of communities (or accounts) on the social media platform that are key contributors to a set of results
  
  &emsp; d. Network visualization of accounts that have shared a particular keyword, hashtag, or URL using additional data they may have shared
  
4. Unique features (optional, but here are some creative and useful features past applicants have built that resulted in successful outcomes):

   &emsp; a. Topic models embedding all the content of results using Tensorflow projector (free, basic), Datamapplot (free, advanced), or Nomic (paid) as a platform to visualize the semantic map of the posts.
   
   &emsp; b. GenAI summaries of the time-series plots for non-technical audiences to understand the trends better.
   
   &emsp; c. Chatbot to query the data and answer questions that the user inputs about the trends for particular topics, themes, narratives, and news articles.
   
   &emsp; d. Connecting offline events from the news articles with the online sharing of posts on social media for specific searches (for example using Wikipedia to find key events in the Russian invasion of Ukraine and map them  to the online narratives that are shared – though this is somewhat manual and not easy to automate, but extremely useful nevertheless).
   
   &emsp; e. Connecting multiple platform datasets together to search for data across multiple social platforms.
   
   &emsp; f. Semantic search after retrieving all posts matching a URL so that the retrieved results can be queried beyond keyword matching.
   
**Bonus** If you host your Jupyter Notebook or JS dashboard, we consider it a significant improvement over applicants who haven’t hosted their solution.


### Link to the dataset 
<a href="https://drive.google.com/drive/folders/13cYfPIV65j5AAh9GjuZR94sAx-7EFjnp?usp=sharing">Dataset</a> 

## Instruction for the submission
These instructions outline how to use GitHub for this assignment.  Please follow them carefully to ensure your work is properly submitted.

1. Fork the Repository:    
   - Go to the assignment repository provided by the instructor: [Insert Repository Link Here] 
   - Click the "Fork" button in the top right corner of the page. This creates a copy of the repository in your GitHub account. 
  
3. Clone Your Fork:
   - Go to your forked repository (it will be in your GitHub account).
   - Click the "Code" button (the green one) and copy the URL. This will be a git URL (ending in .git).
   - Open a terminal or Git Bash on your local machine.
   - Navigate to the directory where you want to work on the assignment using the cd command. For example: `cd /path/to/your/projects`.
   - Clone your forked repository using the following command: git clone <your_forked_repository_url> (Replace <your_forked_repository_url> with the URL you copied).
  
   This will download the repository to your local machine.

4. Develop Your Solution

   Work on your assignment within the cloned repository. Create your code files, visualizations, and any other required deliverables. Make sure to save your work regularly.

6. Commit Your Changes
   - After making changes, you need to "stage" them for commit. This tells Git which changes you want to include in the next snapshot.
   - Use the following command to stage all changes in the current directory:
      - To add all the files - git add. 
      - Or, if you want to stage-specific files - git add <file1> <file2> ...
   - Now, commit your staged changes with a descriptive message- git commit -m "Your commit message here" (Replace "Your commit message here" with a brief1 description of the changes you made.2 Be clear and concise!)
   - Push your commits back to your forked repository on GitHub- git push origin main (Or, if you're working on a branch other than main, replace main with your branch name. origin refers to the remote repository you cloned from). 

7. Please notify us of your submission by emailing simppl.collabs@gmail.com with the subject line "Submitting Research Engineer Intern Assignment for SimPPL".


### Submission Requirements

Please ensure you include:

1. A detailed README file (with screenshots of your solution, a _hosted_ web platform).
2. A text-based explanation of your code and thought process underlying system design. 
3. A link to a video recording of your dashboard hosted on YouTube or Google Drive.

Both of these last two make it easier for us to run your code and evaluate the assignment.

### Resources
1. [OSINT Tools](https://start.me/p/0Pqbdg/osint-500-tools)
2. [Colly](http://go-colly.org/)
3. [AppWorld](https://appworld.dev/)
4. [Scrapling](https://github.com/D4Vinci/Scrapling)
5. [Selenium](https://www.selenium.dev/)
6. [Puppeteer](https://pptr.dev/)
7. [DuckDB](https://github.com/duckdb/duckdb)
8. [Cloudfare Workers](https://workers.cloudflare.com/)
9. [Apache Superset](https://github.com/apache/superset)
10. [Terraform](https://www.hashicorp.com/en/products/terraform)
    
#### Note

Focus on the analysis you are presenting and the story you are telling us through it. A well-designed and scalable system is more important than a complex one with a ton of features. Consider using innovative technologies in a user-friendly manner to create unique features for your platform such as AI-generated summaries that are adaptable to the data a user searches for, using your platform.

Presentation matters! Make sure your submission is easy to understand. Create an intuitive and meaningful README file or a Wiki that can be used to review your solution. Host it so it is accessible by anyone. Ensure that you share a video demo even if it is hosted, so that users understand how to interpret the insights you present.

At SimPPL, we're building tools to analyze how information spreads on social media, especially from unreliable sources. Your work will help inform how to scale our analysis to a wider range of platforms and handle larger datasets. This is crucial for tracking trends, identifying misinformation, and understanding how narratives spread online.

We're excited to see your solution!




