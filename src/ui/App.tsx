import { useState, useRef } from "react";
import {
	Box, 
	Center,
	For, 
	Heading, 
	IconButton, 
	Input, 
	VStack, 
	Textarea,
	Grid, 
	Float, 
	HStack, 
	Button, 
	NumberInput, 
	Checkbox
} from "@chakra-ui/react";

import { Toaster, toaster } from "./components/chakra/toaster";
import { HiOutlinePlus, HiXMark } from "react-icons/hi2";
import config from "../config";

enum Action {
	SPAM,
	DELETE
}

function isWebhookUrlValid(url: string): boolean {
	// eslint-disable-next-line no-useless-escape
	const expression = "^https://discord\.com/api/.*";
	const regex = new RegExp(expression);

	return url.match(regex) !== null;
}

const defaultAmount = 50;
const defaultDelay = 0.75;
const rateLimitCooldown = 3;

function App() {
	const [messages, setMessages] = useState<Array<string>>([""]);

	const [webhookUrl, setWebhookUrl] = useState<string>("");
	const [amount, setAmount] = useState<number>(defaultAmount);
	const [delay, setDelay] = useState<number>(defaultDelay);

	const [isRandomOrder, setIsRandomOrder] = useState<boolean>(false);

	const [isSpamming, setIsSpamming] = useState(false);
	const isSpammingRef = useRef(false);

	// ****************************************************************************************************

	const handleMessageChange = (i: number) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const newMessages = [...messages];
		newMessages[i] = e.target.value;
		setMessages(newMessages);
	}

	const handleMessageRemove = (i: number) => () => {
		setMessages(messages.filter((_, index) => index !== i));
	}

	const handleAddMessage = () => {
		setMessages([...messages, ""]);
	}

	const handleRandomOrderCheckbox = () =>	{
		setIsRandomOrder(!isRandomOrder);
	}	

	const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.value != "") {
			setAmount(Number(e.target.value));
		}
		else {
			setAmount(defaultAmount);
		}
	}

	const handleDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.value != "") {
			setDelay(Number(e.target.value));
		}
		else {
			setDelay(defaultDelay);
		}
	}

	// ****************************************************************************************************

	const getRandomMessage = () => messages[Math.floor(Math.random() * messages.length)];

	const handleWebhook = (action: Action) => async () => {
		if (isWebhookUrlValid(webhookUrl)) {
			if (action == Action.SPAM) {
				setIsSpamming(true);
				isSpammingRef.current = true;

				let messagesSent = 0;

				toaster.create({
					title: `Sending ${amount} messages with ${delay}s delay`,
					type: "success"
				})

				for (let i = 0; i < amount; i++) {
					if (!isSpammingRef.current) {
						toaster.create({
							title: `Stopped spamming webhook. Messages sent: ${messagesSent}`,
							type: "info"
						})
						break
					}

					const message = isRandomOrder ? getRandomMessage() : messages[i % messages.length];

					const response = await fetch(webhookUrl, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ content: message }),
					});

					if (response.status == 429) {
						toaster.create({
							title: `Webhook hit rate limit. Continuing in ${rateLimitCooldown}s`,
							type: "error"
						});

						await new Promise((resolve) => setTimeout(resolve, rateLimitCooldown * 1000));

						continue
					}

					messagesSent++

					await new Promise((resolve) => setTimeout(resolve, delay * 1000));
				}

				toaster.create({
					title: `Successfully sent ${messagesSent} messages`,
					type: "success"
				});

				setIsSpamming(false);
				isSpammingRef.current = false;
			}
			else if (action == Action.DELETE) {
				const response = await fetch(webhookUrl, {
					method: "DELETE"
				})

				if (response.status == 404 || response.status == 401) {
					toaster.create({
						title: "Webhook doesn't exist",
						type: "error"
					});
					return
				}

				if (!response.ok) {
					toaster.create({
						title: "Failed to delete webhook",
						type: "error"
					});
					return
				}

				toaster.create({
					title: "Successfully deleted webhook!",
					type: "success"
				})
			}
		} else {
			toaster.create({
				title: "Invalid Webhook URL",
				type: "error"
			});
		}
	}

	// ****************************************************************************************************

	return (
		<>
			<Toaster />

			<Box h="100vh" bg="linear-gradient(to right, #3c3b3f, #605c3c)">
				<Center h="100%">
					<Box bg="bg.panel" p="8" borderRadius="2xl">
						<Center h="100%">
							<VStack gap="8">
								<Heading fontFamily="mono" fontWeight="light" mb="">UwuSpammer v{config.VERSION}</Heading>

								<Input w="30rem" placeholder="Webhook URL" variant="flushed" onChange={(e) => {setWebhookUrl(e.target.value)}} />

								<HStack justify="center">
									{!isSpamming ? 
										<Button 
											w="calc(30rem / 2)" 
											bg="bg.muted" 
											color="white" 
											onClick={handleWebhook(Action.SPAM)}
										>
											Spam
										</Button>
										: 									
										<Button 
											w="calc(30rem / 2)" 
											bg="bg.muted" 
											color="white" 
											onClick={() => {
												setIsSpamming(false);
												isSpammingRef.current = false;
											}}
										>	
											Stop
										</Button>
									}

									<Button w="calc(30rem / 2)" onClick={handleWebhook(Action.DELETE)} bg="bg.muted" color="white">Delete Webhook</Button>
								</HStack>

								<HStack>
									<NumberInput.Root width="200px">
										<NumberInput.Control />
										<NumberInput.Input placeholder={`Amount (${defaultAmount})`} onChange={handleAmountChange}/>
									</NumberInput.Root>

									<NumberInput.Root width="200px">
										<NumberInput.Control />
										<NumberInput.Input placeholder={`Delay (${defaultDelay}s)`} onChange={handleDelayChange} />
									</NumberInput.Root>
								</HStack>

								<Box p="4" display="flex" flexDir="column">
									<Grid templateColumns="repeat(2, 1fr)" gap="4">
										<For each={messages}>
											{(_, i) => (
												<Box key={i} position="relative">
													<Textarea w="18rem" placeholder={`Message ${i+1}`} onChange={handleMessageChange(i)} />
													
													<Float>
														<IconButton bg="transparent" size="xs" onClick={handleMessageRemove(i)}>
															<HiXMark color="white"/>
														</IconButton>
													</Float>
												</Box>
											)}
										</For>
									</Grid>

									<Box display="flex" justifyContent="flex-end">
										<IconButton bg="transparent" onClick={handleAddMessage}>
											<HiOutlinePlus color="white"/>
										</IconButton>
									</Box>

									<HStack gap="4">
										<Checkbox.Root onCheckedChange={handleRandomOrderCheckbox} checked={isRandomOrder}>
											<Checkbox.HiddenInput />
											<Checkbox.Control />
											<Checkbox.Label>Random order</Checkbox.Label>
										</Checkbox.Root>
									</HStack>
								</Box>
							</VStack>
						</Center>
					</Box>
				</Center>
			</Box>
		</>
	)
}

export default App;
