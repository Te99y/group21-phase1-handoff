import { getBusFactor } from "../models/busFactor.js";
import { getRampUpTime } from "../models/rampUpTime.js";
import { getResponsiveness } from "../models/responsiveness.js";
import fetch from 'node-fetch';

interface repository {
    url: string;
}
interface metadata {
    repository: repository;
}

export class URLHandler {
    async handle(url: string) {
        if (url.includes('github.com')) {
            // GitHub Url, Call Imported Functions
            return await this.GitHubHandler(url);
        } else if (url.includes('npmjs.com')) {
            // NPM URL, Call Fetch Function
            const githubUrl = await this.NPMHandler(url);
            return await this.GitHubHandler(githubUrl);
        } else {
            throw new Error('Unsupported URL. Please provide a GitHub or NPM URL');
        }
    }

    async GitHubHandler(url: string) {
        const { owner, repo } = this.extractOwnerRepo(url);
        
        const busFactor = await getBusFactor(owner, repo);
        const rampUpTime = await getRampUpTime(owner, repo);
        const responsiveness = await getResponsiveness(owner, repo);

        return {
            busFactor,
            rampUpTime,
            responsiveness,
        };
    }

    async NPMHandler(url: string) {
        const packageName = this.extractPackageName(url);
        const metadata = await this.getNpmMetadata(packageName);
        if(typeof metadata === 'object' && metadata !== null
             && 'repository' in metadata && typeof metadata.repository === 'object' 
             && metadata.repository !== null && 'url' in metadata.repository 
             && typeof metadata.repository.url === 'string') {
            return (metadata.repository.url).replace(/^git\+/, '').replace(/\.git$/, '').replace('git://', 'https://');
        }
        else {
            throw new Error('No GitHub repository found for the NPM package. Please provide another NPM URL');
        }
    }

    extractOwnerRepo(url: string) {
        const regex = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)/;
        const match = url.match(regex);
        if (!match) {
            throw new Error("Invalid URL");
        }
        const owner = match[1];
        const repo = match[2];
        return { owner, repo };
    }

    extractPackageName(url: string) {
        const regex = /https:\/\/www\.npmjs\.com\/package\/([^\/]+)/;
        const match = url.match(regex);
        if (!match) {
            throw new Error('Invalid NPM URL');
        }
        return match[1];
    }

    async getNpmMetadata(packageName: string) {
        const response = await fetch(`https://registry.npmjs.org/${packageName}`);
        if (!response.ok) {
            throw new Error('Failed to fetch NPM metadata');
        }
        return await response.json() as metadata;
    }
}